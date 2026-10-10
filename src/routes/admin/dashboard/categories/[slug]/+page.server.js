import { error } from '@sveltejs/kit';
import { getAdminCategory } from '$lib/api/admin.js';
import { adaptProducts } from '$lib/api/adapters.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ params, locals, fetch, cookies }) => {
	try {
		const result = await getAdminCategory(params.slug, locals.adminToken, fetch);
		const category = result?.category || result;
		const rawProducts = result?.products || category?.products || [];

		if (!category || (!category.id && !category.slug)) {
			throw error(404, 'Kategori tidak ditemukan.');
		}

		return {
			category,
			products: adaptProducts(rawProducts)
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Unable to load category detail:', err);
		if (err?.status === 404 || err?.message?.includes('not found')) {
			throw error(404, 'Kategori tidak ditemukan.');
		}
		throw error(err?.status || 500, err?.message || 'Kategori belum dapat dimuat.');
	}
};
