import { parsePrice } from '$lib/pricing.js';

const PRODUCTS_PER_PAGE = 10;

export const load = async ({ locals: { supabase }, url }) => {
	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const from = (page - 1) * PRODUCTS_PER_PAGE;
	const to = from + PRODUCTS_PER_PAGE - 1;

	const [productsResult, categoriesResult, globalAddonsResult] = await Promise.all([
		supabase
			.from('products')
			.select(`
				*,
				category:categories (
					name,
					slug
				),
				product_images (
					id,
					image_url,
					is_primary
				),
				product_addons (
					addon_id,
					is_active,
					global_addons (
						id,
						category,
						name,
						additional_price,
						is_dark_color,
						dark_color_surcharge,
						is_active
					)
				)
			`, { count: 'exact' })
			.eq('is_active', true)
			.order('created_at', { ascending: false })
			.range(from, to),
		supabase.from('categories').select('*').order('name'),
		supabase.from('global_addons').select('*').order('category').order('name')
	]);

	const { data: products, count } = productsResult;
	const { data: categories } = categoriesResult;
	const { data: globalAddons } = globalAddonsResult;
	const totalProducts = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));

	return {
		products: products ?? [],
		pagination: {
			page,
			pageSize: PRODUCTS_PER_PAGE,
			totalProducts,
			totalPages,
			from: totalProducts === 0 ? 0 : from + 1,
			to: Math.min(to + 1, totalProducts)
		},
		categories: categories ?? [],
		globalAddons: globalAddons ?? []
	};
};

function parseProductAddonStates(value) {
	try {
		const parsed = JSON.parse(value || '[]');
		if (!Array.isArray(parsed)) return [];

		return parsed
			.map((item) => ({
				addon_id: String(item?.addon_id || '').trim(),
				is_active: item?.is_active !== false
			}))
			.filter((item) => item.addon_id);
	} catch {
		return [];
	}
}

function generateSlug(text) {
	return String(text ?? '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function parseNewAddons(value) {
	try {
		const parsed = JSON.parse(value || '[]');
		if (!Array.isArray(parsed)) return [];

		return parsed
			.map((item) => {
				const is_dark_color = Boolean(item?.is_dark_color);
				return {
					category: String(item?.category || '').trim(),
					name: String(item?.name || '').trim(),
					additional_price: parsePrice(item?.additional_price),
					is_dark_color,
					dark_color_surcharge: is_dark_color ? parsePrice(item?.dark_color_surcharge) : 0,
					is_active: item?.is_active !== false
				};
			})
			.filter((item) => item.category && item.name);
	} catch {
		return [];
	}
}

async function createNewGlobalAddons(supabase, productId, newAddons) {
	if (newAddons.length === 0) return null;

	const { data: createdAddons, error } = await supabase
		.from('global_addons')
		.insert(newAddons)
		.select('id');

	if (error) return error;

	const rows = (createdAddons ?? []).map((addon) => ({
		product_id: productId,
		addon_id: addon.id,
		is_active: true
	}));

	if (rows.length === 0) return null;

	const { error: relationError } = await supabase.from('product_addons').upsert(rows, {
		onConflict: 'product_id,addon_id'
	});

	return relationError;
}

async function syncProductAddons(supabase, productId, addonStates) {
	const submittedAddonIds = addonStates.map((item) => item.addon_id);

	const { data: existingRows, error: existingError } = await supabase
		.from('product_addons')
		.select('addon_id')
		.eq('product_id', productId);

	if (existingError) return existingError;

	const addonIdsToRemove = (existingRows ?? [])
		.map((row) => row.addon_id)
		.filter((addonId) => !submittedAddonIds.includes(addonId));

	if (addonIdsToRemove.length > 0) {
		const { error } = await supabase
			.from('product_addons')
			.delete()
			.eq('product_id', productId)
			.in('addon_id', addonIdsToRemove);

		if (error) return error;
	}

	if (addonStates.length === 0) return null;

	const uniqueStates = Array.from(
		new Map(addonStates.map((item) => [item.addon_id, item])).values()
	);
	const rows = uniqueStates.map((item) => ({
		product_id: productId,
		addon_id: item.addon_id,
		is_active: item.is_active
	}));

	const { error } = await supabase.from('product_addons').upsert(rows, {
		onConflict: 'product_id,addon_id'
	});
	return error;
}

export const actions = {
	createCategory: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();

		if (!name) return { success: false, error: 'Nama kategori wajib diisi' };

		const slug = generateSlug(name);
		if (!slug) return { success: false, error: 'Slug kategori tidak valid' };

		const { data: existingByName } = await supabase
			.from('categories')
			.select('id')
			.ilike('name', name)
			.limit(1);

		if (existingByName && existingByName.length > 0) {
			return { success: false, error: 'Kategori dengan nama ini sudah ada.' };
		}

		const { data: existingBySlug } = await supabase
			.from('categories')
			.select('id')
			.eq('slug', slug)
			.limit(1);

		if (existingBySlug && existingBySlug.length > 0) {
			return { success: false, error: 'Slug kategori sudah digunakan.' };
		}

		const { data: category, error } = await supabase
			.from('categories')
			.insert({ name, slug })
			.select('*')
			.single();

		if (error) {
			if (error.code === '23505') {
				return { success: false, error: 'Kategori dengan nama atau slug ini sudah ada.' };
			}
			return { success: false, error: error.message };
		}

		return { success: true, category };
	},
	createProduct: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const name = formData.get('name');
		const description = formData.get('description');
		const base_price = formData.get('base_price');
		const is_available = formData.get('is_available') === 'on';
		const category_id = formData.get('category_id');
		const images = formData.getAll('images');
		const addonStates = parseProductAddonStates(formData.get('product_addons'));
		const newAddons = parseNewAddons(formData.get('new_addons'));
		const handling_warning = formData.get('handling_warning');

		if (!name || !base_price) {
			return { success: false, error: 'Name and Base Price are required' };
		}

		// Insert product
		const { data: product, error: productError } = await supabase
			.from('products')
			.insert({
				name,
				description,
				base_price: parseFloat(base_price),
				is_available,
				is_active: true,
				category_id: category_id || null,
				handling_warning
			})
			.select()
			.single();

		if (productError) {
			return { success: false, error: productError.message };
		}

		const addonError = await syncProductAddons(supabase, product.id, addonStates);
		if (addonError) return { success: false, error: addonError.message };

		const newAddonError = await createNewGlobalAddons(supabase, product.id, newAddons);
		if (newAddonError) return { success: false, error: newAddonError.message };

		// Handle images
		if (images && images.length > 0 && images[0].size > 0) {
			const uploadPromises = images.map(async (file, i) => {
				const fileExt = file.name.split('.').pop();
				const fileName = `${product.id}-${Math.random()}.${fileExt}`;
				const filePath = `product/${fileName}`; // Changed to bucket 'products', folder 'product'

				const { error: uploadError } = await supabase.storage
					.from('products')
					.upload(filePath, file);

				if (!uploadError) {
					const { data: publicUrlData } = supabase.storage
						.from('products')
						.getPublicUrl(filePath);

					return {
						product_id: product.id,
						image_url: publicUrlData.publicUrl,
						is_primary: i === 0 // First image is primary
					};
				}
				return null;
			});

			const results = await Promise.all(uploadPromises);
			const imageInserts = results.filter(res => res !== null);

			if (imageInserts.length > 0) {
				await supabase.from('product_images').insert(imageInserts);
			}
		}

		return { success: true };
	},
	updateProduct: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const name = formData.get('name');
		const description = formData.get('description');
		const base_price = formData.get('base_price');
		const is_available = formData.get('is_available') === 'on';
		const category_id = formData.get('category_id');
		const images = formData.getAll('images');
		const deletedImageIdsStr = formData.get('deleted_image_ids');
		const addonStates = parseProductAddonStates(formData.get('product_addons'));
		const newAddons = parseNewAddons(formData.get('new_addons'));
		const handling_warning = formData.get('handling_warning');

		if (!id || !name || !base_price) {
			return { success: false, error: 'ID, Name, and Base Price are required' };
		}

		// Update product
		const { error: productError } = await supabase
			.from('products')
			.update({
				name,
				description,
				base_price: parseFloat(base_price),
				is_available,
				category_id: category_id || null,
				handling_warning
			})
			.eq('id', id);

		if (productError) {
			return { success: false, error: productError.message };
		}

		const addonError = await syncProductAddons(supabase, id, addonStates);
		if (addonError) return { success: false, error: addonError.message };

		const newAddonError = await createNewGlobalAddons(supabase, id, newAddons);
		if (newAddonError) return { success: false, error: newAddonError.message };

		// Delete images
		if (deletedImageIdsStr) {
			const deletedIds = deletedImageIdsStr.split(',').filter(Boolean);
			if (deletedIds.length > 0) {
				// Fetch URLs to delete from storage
				const { data: imagesToDelete } = await supabase
					.from('product_images')
					.select('image_url')
					.in('id', deletedIds);

				if (imagesToDelete && imagesToDelete.length > 0) {
					const paths = imagesToDelete.map(img => {
						const url = new URL(img.image_url);
						const parts = url.pathname.split('/');
						const pathIndex = parts.indexOf('products');
						return parts.slice(pathIndex + 1).join('/');
					});
					
					if (paths.length > 0) {
						await supabase.storage.from('products').remove(paths);
					}
				}

				await supabase.from('product_images').delete().in('id', deletedIds);
			}
		}

		// Upload new images
		if (images && images.length > 0 && images[0].size > 0) {
			const uploadPromises = images.map(async (file) => {
				const fileExt = file.name.split('.').pop();
				const fileName = `${id}-${Math.random()}.${fileExt}`;
				const filePath = `product/${fileName}`;

				const { error: uploadError } = await supabase.storage
					.from('products')
					.upload(filePath, file);

				if (!uploadError) {
					const { data: publicUrlData } = supabase.storage
						.from('products')
						.getPublicUrl(filePath);

					return {
						product_id: id,
						image_url: publicUrlData.publicUrl,
						is_primary: false // default to false initially
					};
				}
				return null;
			});

			const results = await Promise.all(uploadPromises);
			const imageInserts = results.filter(res => res !== null);

			if (imageInserts.length > 0) {
				await supabase.from('product_images').insert(imageInserts);
			}
		}

		// Ensure one image is primary
		const { data: currentImages } = await supabase
			.from('product_images')
			.select('id, is_primary')
			.eq('product_id', id)
			.order('created_at', { ascending: true });

		if (currentImages && currentImages.length > 0) {
			const hasPrimary = currentImages.some(img => img.is_primary);
			if (!hasPrimary) {
				await supabase
					.from('product_images')
					.update({ is_primary: true })
					.eq('id', currentImages[0].id);
			}
		}

		return { success: true };
	},
	deleteProduct: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return { success: false, error: 'Missing ID' };

		const { error } = await supabase
			.from('products')
			.update({ is_active: false })
			.eq('id', id);
		if (error) return { success: false, error: error.message };
		return { success: true, archived: true };
	},
	toggleAvailability: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const is_available = formData.get('is_available') === 'true';

		if (!id) return { success: false, error: 'Missing ID' };

		const { error } = await supabase
			.from('products')
			.update({ is_available: !is_available })
			.eq('id', id);
			
		if (error) return { success: false, error: error.message };
		return { success: true };
	}
};
