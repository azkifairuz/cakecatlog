import { parsePrice } from '$lib/pricing.js';
import { getProductFieldErrors } from '$lib/product-validation.js';
import { fail } from '@sveltejs/kit';
import {
	getAdminProducts,
	getAdminCategories,
	getAdminAddons,
	createAdminCategory,
	createAdminProduct,
	updateAdminProduct,
	deleteAdminProduct,
	setAdminProductAvailability,
	uploadAdminProductImages,
	setAdminPrimaryProductImage,
	deleteAdminProductImage,
	syncAdminProductVariants,
	syncAdminProductAddons
} from '$lib/api/admin.js';
import { uploadProductImage } from '$lib/api/upload.js';
import { adaptProducts, adaptAddons } from '$lib/api/adapters.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

const PRODUCTS_PER_PAGE = 10;

export const load = async ({ locals, url, fetch, cookies }) => {
	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const search = String(url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const categoryIds = url.searchParams
		.getAll('category')
		.map((value) => String(value).trim())
		.filter((value) => value && value !== 'all');

	let productsRes, categoriesRes, globalAddonsRes;
	try {
		[productsRes, categoriesRes, globalAddonsRes] = await Promise.all([
			getAdminProducts(
				{
					page,
					pageSize: PRODUCTS_PER_PAGE,
					q: search || undefined,
					categoryIds: categoryIds.length > 0 ? categoryIds : undefined
				},
				locals.adminToken,
				fetch
			),
			getAdminCategories(locals.adminToken, fetch),
			getAdminAddons(locals.adminToken, fetch)
		]);
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Failed to load admin products:', err);
		productsRes = { items: [], pagination: { page: 1, pageSize: PRODUCTS_PER_PAGE, totalItems: 0, totalPages: 1 } };
		categoriesRes = [];
		globalAddonsRes = [];
	}

	const rawProducts = productsRes?.items || productsRes?.products || [];
	const rawPagination = productsRes?.pagination || {};
	const totalProducts = Number(rawPagination.totalItems ?? rawPagination.totalCount ?? rawProducts.length);
	const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));

	const categories = Array.isArray(categoriesRes) ? categoriesRes : categoriesRes?.categories || [];
	const rawGlobalAddons = Array.isArray(globalAddonsRes) ? globalAddonsRes : globalAddonsRes?.addons || [];
	const globalAddons = adaptAddons(rawGlobalAddons);

	return {
		products: adaptProducts(rawProducts),
		pagination: {
			page,
			pageSize: PRODUCTS_PER_PAGE,
			totalProducts,
			totalPages,
			from: totalProducts === 0 ? 0 : (page - 1) * PRODUCTS_PER_PAGE + 1,
			to: Math.min(page * PRODUCTS_PER_PAGE, totalProducts)
		},
		filters: {
			search,
			categories: categoryIds
		},
		categories,
		globalAddons
	};
};

function parseProductAddonStates(value) {
	try {
		const parsed = JSON.parse(value || '[]');
		if (!Array.isArray(parsed)) return [];

		return parsed
			.map((item) => ({
				addon_id: String(item?.addon_id || item?.id || '').trim(),
				is_active: item?.is_active !== false
			}))
			.filter((item) => item.addon_id);
	} catch {
		return [];
	}
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
					additionalPrice: parsePrice(item?.additional_price ?? item?.additionalPrice),
					isDarkColor: is_dark_color,
					darkColorSurcharge: is_dark_color
						? parsePrice(item?.dark_color_surcharge ?? item?.darkColorSurcharge)
						: 0
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

		return parsed.map((item, index) => ({
			id: item?.id ? String(item.id) : null,
			name: String(item?.name || '').trim(),
			price: item?.price ?? '',
			isActive: item?.is_active !== false && item?.isActive !== false,
			displayOrder: Number.isFinite(Number(item?.display_order ?? item?.displayOrder))
				? Number(item.display_order ?? item.displayOrder)
				: index
		}));
	} catch {
		return [];
	}
}

function getPersistableProductVariants(variants) {
	return variants
		.filter((variant) => variant.name && parsePrice(variant.price) > 0)
		.map((variant) => ({
			...variant,
			price: parsePrice(variant.price)
		}));
}

function parsePrimaryImageKey(value) {
	const [type, rawIndexOrId] = String(value || '').split(':');
	if ((type !== 'existing' && type !== 'new') || !rawIndexOrId) return null;
	return { type, value: rawIndexOrId };
}

export const actions = {
	createCategory: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();

		if (!name) return { success: false, error: 'Nama kategori wajib diisi' };

		try {
			const category = await createAdminCategory({ name }, locals.adminToken, fetch);
			return { success: true, category };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			return { success: false, error: err?.message || 'Gagal menambahkan kategori.' };
		}
	},

	createProduct: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();
		const description = String(formData.get('description') || '').trim() || null;
		const base_price = formData.get('base_price');
		const is_available = formData.get('is_available') === 'on';
		const category_id = formData.get('category_id') || null;
		const images = formData.getAll('images');
		const primaryImageKey = formData.get('primary_image_key');
		const parsedProductVariants = parseProductVariants(formData.get('product_variants'));
		const addonStates = parseProductAddonStates(formData.get('product_addons'));
		const newAddons = parseNewAddons(formData.get('new_addons'));
		const handling_warning = String(formData.get('handling_warning') || '').trim() || null;

		const fieldErrors = getProductFieldErrors({
			name,
			basePrice: base_price,
			variants: parsedProductVariants
		});
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				success: false,
				error: 'Periksa kembali field yang ditandai.',
				fieldErrors
			});
		}

		const productVariants = getPersistableProductVariants(parsedProductVariants);
		const selectedPrimary = parsePrimaryImageKey(primaryImageKey);

		// Upload images to backend first
		const uploadedImages = [];
		const validImages = (images ?? []).filter((file) => file instanceof File && file.size > 0);

		for (let i = 0; i < validImages.length; i++) {
			const file = validImages[i];
			try {
				const uploadRes = await uploadProductImage(file, locals.adminToken, fetch);
				const imageUrl = uploadRes?.publicUrl || uploadRes?.imageUrl;
				if (imageUrl) {
					uploadedImages.push({
						imageUrl,
						isPrimary:
							selectedPrimary?.type === 'new'
								? Number(selectedPrimary.value) === i
								: i === 0 && !selectedPrimary
					});
				}
			} catch (uploadErr) {
				handleAdminAuthError(uploadErr, cookies);
				console.error('Image upload failed:', uploadErr);
			}
		}

		const activeAddonIds = addonStates
			.filter((state) => state.is_active !== false)
			.map((state) => state.addon_id);

		const productPayload = {
			name,
			description,
			basePrice: parsePrice(base_price),
			categoryId: category_id || null,
			isAvailable: is_available,
			handlingWarning: handling_warning,
			variants: productVariants,
			addonIds: activeAddonIds,
			newAddons,
			images: uploadedImages
		};

		try {
			await createAdminProduct(productPayload, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create product error:', err);
			return fail(500, {
				success: false,
				error: err?.message || 'Gagal membuat produk baru.'
			});
		}
	},

	updateProduct: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const name = String(formData.get('name') || '').trim();
		const description = String(formData.get('description') || '').trim() || null;
		const base_price = formData.get('base_price');
		const is_available = formData.get('is_available') === 'on';
		const category_id = formData.get('category_id') || null;
		const images = formData.getAll('images');
		const primaryImageKey = formData.get('primary_image_key');
		const deletedImageIdsStr = formData.get('deleted_image_ids');
		const parsedProductVariants = parseProductVariants(formData.get('product_variants'));
		const addonStates = parseProductAddonStates(formData.get('product_addons'));
		const newAddons = parseNewAddons(formData.get('new_addons'));
		const handling_warning = String(formData.get('handling_warning') || '').trim() || null;

		if (!id) {
			return fail(400, { success: false, error: 'ID produk tidak ditemukan.' });
		}

		const fieldErrors = getProductFieldErrors({
			name,
			basePrice: base_price,
			variants: parsedProductVariants
		});
		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				success: false,
				error: 'Periksa kembali field yang ditandai.',
				fieldErrors
			});
		}

		const productVariants = getPersistableProductVariants(parsedProductVariants);
		const activeAddonIds = addonStates
			.filter((state) => state.is_active !== false)
			.map((state) => state.addon_id);

		const productPayload = {
			name,
			description,
			basePrice: parsePrice(base_price),
			categoryId: category_id || null,
			isAvailable: is_available,
			handlingWarning: handling_warning,
			variants: productVariants,
			addonIds: activeAddonIds,
			newAddons
		};

		try {
			// 1. Update product base info
			await updateAdminProduct(id, productPayload, locals.adminToken, fetch);

			// 2. Sync variants & addons
			await syncAdminProductVariants(id, productVariants, locals.adminToken, fetch);
			await syncAdminProductAddons(id, activeAddonIds, newAddons, locals.adminToken, fetch);

			// 3. Delete requested images
			if (deletedImageIdsStr) {
				const deletedIds = deletedImageIdsStr.split(',').map((s) => s.trim()).filter(Boolean);
				for (const imgId of deletedIds) {
					try {
						await deleteAdminProductImage(id, imgId, locals.adminToken, fetch);
					} catch (delErr) {
						handleAdminAuthError(delErr, cookies);
						console.error('Delete image error:', delErr);
					}
				}
			}

			// 4. Upload new images
			const selectedPrimary = parsePrimaryImageKey(primaryImageKey);
			const validImages = (images ?? []).filter((file) => file instanceof File && file.size > 0);
			const newlyUploaded = [];

			for (let i = 0; i < validImages.length; i++) {
				const file = validImages[i];
				try {
					const uploadRes = await uploadProductImage(file, locals.adminToken, fetch);
					const imageUrl = uploadRes?.publicUrl || uploadRes?.imageUrl;
					if (imageUrl) {
						newlyUploaded.push({
							imageUrl,
							isPrimary: selectedPrimary?.type === 'new' && Number(selectedPrimary.value) === i
						});
					}
				} catch (upErr) {
					handleAdminAuthError(upErr, cookies);
					console.error('Upload image error:', upErr);
				}
			}

			if (newlyUploaded.length > 0) {
				await uploadAdminProductImages(id, newlyUploaded, locals.adminToken, fetch);
			}

			// 5. Update primary image if existing image selected
			if (selectedPrimary?.type === 'existing') {
				await setAdminPrimaryProductImage(id, selectedPrimary.value, locals.adminToken, fetch);
			}

			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update product error:', err);
			return fail(500, {
				success: false,
				error: err?.message || 'Gagal memperbarui produk.'
			});
		}
	},

	deleteProduct: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return fail(400, { success: false, error: 'Missing ID' });

		try {
			await deleteAdminProduct(id, locals.adminToken, fetch);
			return { success: true, archived: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete product error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal menghapus produk.' });
		}
	},

	toggleAvailability: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const is_available = formData.get('is_available') === 'true';

		if (!id) return fail(400, { success: false, error: 'Missing ID' });

		try {
			await setAdminProductAvailability(id, !is_available, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Toggle availability error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal mengubah ketersediaan.' });
		}
	}
};
