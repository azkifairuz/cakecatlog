import { redirect } from '@sveltejs/kit';
import { logoutAdmin } from '$lib/api/auth.js';

export const actions = {
	default: async ({ cookies, locals, fetch }) => {
		const token = locals.adminToken;
		if (token) {
			try {
				await logoutAdmin(token, fetch);
			} catch (err) {
				console.error('Logout error:', err);
			}
		}

		cookies.delete('admin_access_token', { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
