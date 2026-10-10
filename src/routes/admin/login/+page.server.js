import { fail, redirect } from '@sveltejs/kit';
import { loginAdmin } from '$lib/api/auth.js';

export const actions = {
	default: async ({ request, cookies, fetch }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') || '').trim();
		const password = String(formData.get('password') || '');
		console.log("ini api nya ke hit loh")
		if (!email || !password) {
			return fail(400, { error: 'Email dan password wajib diisi.', email });
		}

		try {
			const loginResult = await loginAdmin(email, password, fetch);
			const token = loginResult?.accessToken || loginResult?.token;

			if (!token) {
				return fail(400, { error: 'Gagal login, token otentikasi tidak ditemukan.', email });
			}

			cookies.set('admin_access_token', token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7 // 7 days
			});

			return {
				success: true,
				accessToken: token
			};
		} catch (err) {
			console.error('Admin login error:', err);
			return fail(400, {
				error: err?.message || 'Email atau password salah.',
				email
			});
		}
	}
};
