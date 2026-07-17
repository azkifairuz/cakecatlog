import { parsePrice } from '$lib/pricing.js';
import { fail } from '@sveltejs/kit';

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
				product_variants (
					id,
					name,
					price,
					is_active,
					display_order
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

function parseProductVariants(value) {
	try {
		const parsed = JSON.parse(value || '[]');
		if (!Array.isArray(parsed)) return [];

		return parsed
			.map((item, index) => ({
				id: item?.id ? String(item.id) : null,
				name: String(item?.name || '').trim(),
				price: parsePrice(item?.price),
				is_active: item?.is_active !== false,
				display_order: Number.isFinite(Number(item?.display_order)) ? Number(item.display_order) : index
			}))
			.filter((item) => item.name && item.price > 0);
	} catch {
		return [];
	}
}

async function syncProductVariants(supabase, productId, variants) {
	const submittedIds = variants.map((variant) => variant.id).filter(Boolean);

	const { data: existingRows, error: existingError } = await supabase
		.from('product_variants')
		.select('id')
		.eq('product_id', productId);

	if (existingError) return existingError;

	const variantIdsToRemove = (existingRows ?? [])
		.map((row) => row.id)
		.filter((id) => !submittedIds.includes(id));

	if (variantIdsToRemove.length > 0) {
		const { error } = await supabase
			.from('product_variants')
			.delete()
			.eq('product_id', productId)
			.in('id', variantIdsToRemove);
		if (error) return error;
	}

	if (variants.length === 0) return null;

	const rows = variants.map((variant) => ({
		...(variant.id ? { id: variant.id } : {}),
		product_id: productId,
		name: variant.name,
		price: variant.price,
		is_active: variant.is_active,
		display_order: variant.display_order
	}));

	const { error } = await supabase.from('product_variants').upsert(rows, {
		onConflict: 'id'
	});
	return error;
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

function getProductPayload({
	name,
	description,
	base_price,
	is_available,
	category_id,
	handling_warning
}) {
	const payload = {
		name,
		description,
		base_price: parsePrice(base_price),
		is_available,
		category_id: category_id || null
	};

	if (handling_warning) {
		payload.handling_warning = handling_warning;
	}

	return payload;
}

function isMissingHandlingWarningColumn(error) {
	return error?.code === 'PGRST204' && String(error?.message || '').includes('handling_warning');
}

async function insertProduct(supabase, payload) {
	let { data, error } = await supabase.from('products').insert(payload).select().single();

	if (isMissingHandlingWarningColumn(error)) {
		const { handling_warning: _handlingWarning, ...fallbackPayload } = payload;
		({ data, error } = await supabase.from('products').insert(fallbackPayload).select().single());
	}

	return { data, error };
}

async function updateProductRow(supabase, id, payload) {
	let { error } = await supabase.from('products').update(payload).eq('id', id);

	if (isMissingHandlingWarningColumn(error)) {
		const { handling_warning: _handlingWarning, ...fallbackPayload } = payload;
		({ error } = await supabase.from('products').update(fallbackPayload).eq('id', id));
	}

	return error;
}

function parsePrimaryImageKey(value) {
	const [type, rawIndexOrId] = String(value || '').split(':');
	if ((type !== 'existing' && type !== 'new') || !rawIndexOrId) return null;
	return { type, value: rawIndexOrId };
}

async function uploadProductImages(supabase, productId, images, primaryImageKey) {
	const selectedPrimary = parsePrimaryImageKey(primaryImageKey);
	const validImages = (images ?? []).filter((file) => file?.size > 0);
	if (validImages.length === 0) return { error: null };

	const uploadPromises = validImages.map(async (file, i) => {
		const fileExt = file.name.split('.').pop();
		const fileName = `${productId}-${Math.random()}.${fileExt}`;
		const filePath = `product/${fileName}`;

		const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file);
		if (uploadError) return null;

		const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath);
		return {
			product_id: productId,
			image_url: publicUrlData.publicUrl,
			is_primary: selectedPrimary?.type === 'new'
				? Number(selectedPrimary.value) === i
				: i === 0 && !selectedPrimary
		};
	});

	const results = await Promise.all(uploadPromises);
	const imageInserts = results.filter(Boolean);
	if (imageInserts.length === 0) return { error: null };

	const { data: insertedImages, error } = await supabase
		.from('product_images')
		.insert(imageInserts)
		.select('id, is_primary');

	return { insertedImages: insertedImages ?? [], error };
}

async function applyPrimaryImage(supabase, productId, primaryImageKey) {
	const selectedPrimary = parsePrimaryImageKey(primaryImageKey);

	if (selectedPrimary?.type === 'existing') {
		const { error: clearError } = await supabase
			.from('product_images')
			.update({ is_primary: false })
			.eq('product_id', productId);
		if (clearError) return clearError;

		const { error: setError } = await supabase
			.from('product_images')
			.update({ is_primary: true })
			.eq('product_id', productId)
			.eq('id', selectedPrimary.value);
		if (setError) return setError;
	}

	const { data: currentImages, error: currentImagesError } = await supabase
		.from('product_images')
		.select('id, is_primary')
		.eq('product_id', productId)
		.order('created_at', { ascending: true });

	if (currentImagesError) return currentImagesError;

	if (currentImages?.length && !currentImages.some((img) => img.is_primary)) {
		const { error } = await supabase
			.from('product_images')
			.update({ is_primary: true })
			.eq('id', currentImages[0].id);
		return error;
	}

	return null;
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
		const primaryImageKey = formData.get('primary_image_key');
		const productVariants = parseProductVariants(formData.get('product_variants'));
		const addonStates = parseProductAddonStates(formData.get('product_addons'));
		const newAddons = parseNewAddons(formData.get('new_addons'));
		const handling_warning = formData.get('handling_warning');

		if (!name || !base_price) {
			return fail(400, { success: false, error: 'Name and Base Price are required' });
		}

		const { data: product, error: productError } = await insertProduct(supabase, {
			...getProductPayload({
				name,
				description,
				base_price,
				is_available,
				category_id,
				handling_warning
			}),
			is_active: true
		});

		if (productError) {
			console.error('Create product error:', productError);
			return fail(500, { success: false, error: productError.message });
		}

		const variantError = await syncProductVariants(supabase, product.id, productVariants);
		if (variantError) return fail(500, { success: false, error: variantError.message });

		const addonError = await syncProductAddons(supabase, product.id, addonStates);
		if (addonError) return fail(500, { success: false, error: addonError.message });

		const newAddonError = await createNewGlobalAddons(supabase, product.id, newAddons);
		if (newAddonError) return fail(500, { success: false, error: newAddonError.message });

		const { error: uploadImagesError } = await uploadProductImages(supabase, product.id, images, primaryImageKey);
		if (uploadImagesError) return fail(500, { success: false, error: uploadImagesError.message });

		const primaryError = await applyPrimaryImage(supabase, product.id, primaryImageKey);
		if (primaryError) return fail(500, { success: false, error: primaryError.message });

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
		const primaryImageKey = formData.get('primary_image_key');
		const deletedImageIdsStr = formData.get('deleted_image_ids');
		const productVariants = parseProductVariants(formData.get('product_variants'));
		const addonStates = parseProductAddonStates(formData.get('product_addons'));
		const newAddons = parseNewAddons(formData.get('new_addons'));
		const handling_warning = formData.get('handling_warning');

		if (!id || !name || !base_price) {
			return fail(400, { success: false, error: 'ID, Name, and Base Price are required' });
		}

		const productError = await updateProductRow(
			supabase,
			id,
			getProductPayload({
				name,
				description,
				base_price,
				is_available,
				category_id,
				handling_warning
			})
		);

		if (productError) {
			console.error('Update product error:', productError);
			return fail(500, { success: false, error: productError.message });
		}

		const variantError = await syncProductVariants(supabase, id, productVariants);
		if (variantError) return fail(500, { success: false, error: variantError.message });

		const addonError = await syncProductAddons(supabase, id, addonStates);
		if (addonError) return fail(500, { success: false, error: addonError.message });

		const newAddonError = await createNewGlobalAddons(supabase, id, newAddons);
		if (newAddonError) return fail(500, { success: false, error: newAddonError.message });

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

		const { error: uploadImagesError } = await uploadProductImages(supabase, id, images, primaryImageKey);
		if (uploadImagesError) return fail(500, { success: false, error: uploadImagesError.message });

		const primaryError = await applyPrimaryImage(supabase, id, primaryImageKey);
		if (primaryError) return fail(500, { success: false, error: primaryError.message });

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
