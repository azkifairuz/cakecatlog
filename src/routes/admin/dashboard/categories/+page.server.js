import { fail } from '@sveltejs/kit';
import {
	getAdminCategories,
	createAdminCategory,
	deleteAdminCategory
} from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, fetch, cookies }) => {
	try {
		const categories = await getAdminCategories(locals.adminToken, fetch);
		return {
			categories: Array.isArray(categories) ? categories : []
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Failed to load admin categories:', err);
		return {
			categories: []
		};
	}
};

export const actions = {
	createCategory: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();

		if (!name) return fail(400, { success: false, error: 'Nama kategori wajib diisi' });

		try {
			await createAdminCategory({ name }, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create category error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal menambahkan kategori.'
			});
		}
	},
	deleteCategory: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return fail(400, { success: false, error: 'Missing ID' });

		try {
			await deleteAdminCategory(id, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete category error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal menghapus kategori.'
			});
		}
	}
};
