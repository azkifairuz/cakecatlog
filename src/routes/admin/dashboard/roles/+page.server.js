import { fail } from '@sveltejs/kit';
import {
	getAdminRoles,
	getAdminPermissions,
	createAdminRole,
	updateAdminRole,
	deleteAdminRole
} from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
import { validateRoleInput } from '$lib/employee-role-utils.js';

export const load = async ({ locals, fetch, cookies }) => {
	try {
		const [rolesData, permissionsData] = await Promise.all([
			getAdminRoles(locals.adminToken, fetch),
			getAdminPermissions(locals.adminToken, fetch).catch((err) => {
				console.warn('Failed to load permissions:', err);
				return [];
			})
		]);

		const roles = Array.isArray(rolesData) ? rolesData : rolesData?.data || [];
		const permissions = Array.isArray(permissionsData) ? permissionsData : permissionsData?.data || [];

		return {
			roles,
			permissions,
			isForbidden: false
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Failed to load admin roles:', err);
		const isForbidden =
			err?.status === 403 ||
			err?.code === 'FORBIDDEN' ||
			String(err?.message || '').toLowerCase().includes('forbidden') ||
			String(err?.message || '').toLowerCase().includes('super admin');

		return {
			roles: [],
			permissions: [],
			isForbidden,
			error: err?.message || 'Gagal memuat data role & hak akses.'
		};
	}
};

export const actions = {
	createRole: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();
		const permissionKeys = formData.getAll('permissionKeys').map((p) => String(p).trim()).filter(Boolean);

		const validation = validateRoleInput({ name });
		if (!validation.isValid) {
			return fail(400, { success: false, error: validation.error });
		}

		try {
			await createAdminRole({ name, permissionKeys }, locals.adminToken, fetch);
			return { success: true, message: `Role "${name}" berhasil dibuat.` };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create role error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal membuat role baru.'
			});
		}
	},

	updateRole: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const name = String(formData.get('name') || '').trim();
		const permissionKeys = formData.getAll('permissionKeys').map((p) => String(p).trim()).filter(Boolean);

		if (!id) {
			return fail(400, { success: false, error: 'ID role tidak ditemukan.' });
		}

		const validation = validateRoleInput({ name });
		if (!validation.isValid) {
			return fail(400, { success: false, error: validation.error });
		}

		try {
			await updateAdminRole(id, { name, permissionKeys }, locals.adminToken, fetch);
			return { success: true, message: `Role "${name}" berhasil diperbarui.` };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update role error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal memperbarui role.'
			});
		}
	},

	deleteRole: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) {
			return fail(400, { success: false, error: 'ID role wajib diisi.' });
		}

		try {
			await deleteAdminRole(id, locals.adminToken, fetch);
			return { success: true, message: 'Role berhasil dihapus.' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete role error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal menghapus role.'
			});
		}
	}
};
