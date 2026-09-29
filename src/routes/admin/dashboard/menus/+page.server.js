import { fail } from '@sveltejs/kit';
import { getAdminMenus, createAdminMenu, updateAdminMenu, deleteAdminMenu, getAdminRoles, getAdminRoleMenus, updateAdminRoleMenus } from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, fetch, cookies, url }) => {
	const roleId = url.searchParams.get('role') || '';
	try {
		const [menus, roles] = await Promise.all([
			getAdminMenus(locals.adminToken, fetch),
			getAdminRoles(locals.adminToken, fetch)
		]);
		const roleMenus = roleId ? await getAdminRoleMenus(roleId, locals.adminToken, fetch) : null;
		return { menus: Array.isArray(menus) ? menus : [], roles: Array.isArray(roles) ? roles : [], roleId, roleMenuIds: (roleMenus?.menus || []).map((menu) => menu.id) };
	} catch (error) {
		handleAdminAuthError(error, cookies);
		return { menus: [], roles: [], roleId, roleMenuIds: [], error: error?.message || 'Gagal memuat menu.' };
	}
};

function menuInput(form) {
	return {
		name: String(form.get('name') || '').trim(),
		url: String(form.get('url') || '').trim(),
		icon: String(form.get('icon') || '').trim(),
		displayOrder: Number(form.get('displayOrder')),
		isActive: form.get('isActive') === 'on'
	};
}

export const actions = {
	save: async ({ request, locals, fetch, cookies }) => {
		const form = await request.formData();
		const id = String(form.get('id') || '');
		const input = menuInput(form);
		if (!input.name || !input.url.startsWith('/admin/') || !Number.isFinite(input.displayOrder)) return fail(400, { error: 'Nama, URL admin, dan urutan wajib diisi.' });
		try {
			if (id) await updateAdminMenu(id, input, locals.adminToken, fetch);
			else await createAdminMenu(input, locals.adminToken, fetch);
			return { success: true, message: 'Menu berhasil disimpan.' };
		} catch (error) {
			handleAdminAuthError(error, cookies);
			return fail(400, { error: error?.message || 'Gagal menyimpan menu.' });
		}
	},
	remove: async ({ request, locals, fetch, cookies }) => {
		const id = String((await request.formData()).get('id') || '');
		if (!id) return fail(400, { error: 'ID menu wajib diisi.' });
		try {
			await deleteAdminMenu(id, locals.adminToken, fetch);
			return { success: true, message: 'Menu berhasil dinonaktifkan.' };
		} catch (error) {
			handleAdminAuthError(error, cookies);
			return fail(400, { error: error?.message || 'Gagal menonaktifkan menu.' });
		}
	},
	roleMenus: async ({ request, locals, fetch, cookies }) => {
		const form = await request.formData();
		const roleId = String(form.get('roleId') || '');
		if (!roleId) return fail(400, { error: 'Role wajib dipilih.' });
		try {
			await updateAdminRoleMenus(roleId, form.getAll('menuIds').map(String), locals.adminToken, fetch);
			return { success: true, message: 'Menu role berhasil disimpan.' };
		} catch (error) {
			handleAdminAuthError(error, cookies);
			return fail(400, { error: error?.message || 'Gagal menyimpan menu role.' });
		}
	}
};
