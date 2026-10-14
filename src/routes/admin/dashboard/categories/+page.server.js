import { fail } from '@sveltejs/kit';
import {
	getAdminCategories,
	createAdminCategory,
	updateAdminCategory,
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
 updateCategory: async ({ request, locals, fetch, cookies }) => {
  const form = await request.formData(); const values = { id: String(form.get('id') || ''), name: String(form.get('name') || '').trim(), slug: String(form.get('slug') || '').trim() };
  if (!values.id || !values.name || values.name.length > 100 || !values.slug || values.slug.length > 120) return fail(422, { error: 'Nama dan slug kategori wajib diisi dengan benar.', values });
  try { await updateAdminCategory(values.id, { name: values.name, slug: values.slug }, locals.adminToken, fetch); return { success: true, message: 'Kategori diperbarui.' }; }
  catch (err) { handleAdminAuthError(err, cookies); return fail(err.status || 500, { error: err.message || 'Gagal memperbarui kategori.', values }); }
 },
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
