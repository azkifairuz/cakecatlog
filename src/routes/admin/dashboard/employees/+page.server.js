import { fail } from '@sveltejs/kit';
import {
	getAdminEmployees,
	getAdminRoles,
	createAdminEmployee,
	updateAdminEmployee,
	resetAdminEmployeePassword,
	deleteAdminEmployee
} from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
import { validateEmployeeInput } from '$lib/employee-role-utils.js';

export const load = async ({ locals, fetch, cookies }) => {
	try {
		const [employeesData, rolesData] = await Promise.all([
			getAdminEmployees(locals.adminToken, fetch),
			getAdminRoles(locals.adminToken, fetch).catch((err) => {
				console.warn('Failed to load roles for employee selector:', err);
				return [];
			})
		]);

		const employees = Array.isArray(employeesData) ? employeesData : employeesData?.data || [];
		const roles = Array.isArray(rolesData) ? rolesData : rolesData?.data || [];

		return {
			employees,
			roles,
			isForbidden: false
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Failed to load admin employees:', err);
		const isForbidden =
			err?.status === 403 ||
			err?.code === 'FORBIDDEN' ||
			String(err?.message || '').toLowerCase().includes('forbidden') ||
			String(err?.message || '').toLowerCase().includes('super admin');

		return {
			employees: [],
			roles: [],
			isForbidden,
			error: err?.message || 'Gagal memuat data karyawan admin.'
		};
	}
};

export const actions = {
	createEmployee: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') || '').trim();
		const username = String(formData.get('username') || '').trim();
		const password = String(formData.get('password') || '').trim();
		const roleId = String(formData.get('roleId') || '').trim();

		const validation = validateEmployeeInput({ email, username, password, isEdit: false });
		if (!validation.isValid) {
			return fail(400, { success: false, error: validation.error });
		}

		const payload = {
			email,
			username,
			password,
			...(roleId ? { roleId, role_id: roleId } : {})
		};

		try {
			await createAdminEmployee(payload, locals.adminToken, fetch);
			return { success: true, message: `Akun karyawan "${username}" berhasil dibuat.` };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create employee error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal membuat akun karyawan baru.'
			});
		}
	},

	updateEmployee: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const email = String(formData.get('email') || '').trim();
		const username = String(formData.get('username') || '').trim();
		const roleId = String(formData.get('roleId') || '').trim();

		if (!id) {
			return fail(400, { success: false, error: 'ID karyawan tidak ditemukan.' });
		}

		const validation = validateEmployeeInput({ email, username, isEdit: true });
		if (!validation.isValid) {
			return fail(400, { success: false, error: validation.error });
		}

		const payload = {
			email,
			username,
			...(roleId ? { roleId, role_id: roleId } : {})
		};

		try {
			await updateAdminEmployee(id, payload, locals.adminToken, fetch);
			return { success: true, message: `Data karyawan "${username}" berhasil diperbarui.` };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update employee error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal memperbarui data karyawan.'
			});
		}
	},

	resetPassword: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const newPassword = String(formData.get('newPassword') || '').trim();

		if (!id) {
			return fail(400, { success: false, error: 'ID karyawan wajib diisi.' });
		}

		if (!newPassword || newPassword.length < 8) {
			return fail(400, { success: false, error: 'Password baru minimal 8 karakter.' });
		}

		try {
			await resetAdminEmployeePassword(id, newPassword, locals.adminToken, fetch);
			return { success: true, message: 'Password karyawan berhasil di-reset.' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Reset employee password error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal mereset password karyawan.'
			});
		}
	},

	deleteEmployee: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) {
			return fail(400, { success: false, error: 'ID karyawan wajib diisi.' });
		}

		try {
			await deleteAdminEmployee(id, locals.adminToken, fetch);
			return { success: true, message: 'Akun karyawan berhasil dihapus.' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete employee error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal menghapus akun karyawan.'
			});
		}
	}
};
