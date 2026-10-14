import { error, fail, redirect } from '@sveltejs/kit';
import { generateAdminApiKey, deleteAdminApiKey } from '$lib/api/api-keys.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

function requireAccount({ locals, setHeaders }) {
	setHeaders({ 'cache-control': 'private, no-store' });
	if (!locals.adminToken) redirect(303, '/admin/login');
	if (!locals.adminUser?.username) error(503, 'Akun admin belum dapat dimuat. Silakan coba lagi.');
	return locals.adminUser;
}

export const load = (event) => ({ username: requireAccount(event).username });

export const actions = {
	generate: async (event) => {
		const admin = requireAccount(event);
		const form = await event.request.formData();
		const username = String(form.get('username') || '').trim();
		const password = String(form.get('password') || '');
		if (!username || !password.trim() || username.length > 100 || password.length > 200) {
			return fail(422, { action: 'generate', error: 'Username dan password wajib diisi dengan benar.' });
		}
		if (username.toLowerCase() !== admin.username.trim().toLowerCase()) {
			return fail(403, { action: 'generate', error: 'Gunakan username akun yang sedang login.' });
		}
		try {
			const result = await generateAdminApiKey(username, password, event.fetch);
			if (!result?.apiKey || !result?.expiresAt) {
				return fail(502, { action: 'generate', error: 'Respons API key tidak lengkap. Silakan generate ulang.' });
			}
			return { action: 'generate', success: true, apiKey: result.apiKey, expiresAt: result.expiresAt, message: 'API key berhasil dibuat. Salin dan simpan key sekarang.' };
		} catch (err) {
			// A wrong credential password must not invalidate the current admin session.
			const status = [401, 403, 422, 429, 503].includes(err?.status) ? err.status : 500;
			return fail(status, { action: 'generate', error: err?.message || 'Gagal membuat API key.' });
		}
	},
	remove: async (event) => {
		requireAccount(event);
		const form = await event.request.formData();
		if (form.get('confirmDelete') !== 'on') {
			return fail(422, { action: 'remove', error: 'Konfirmasi penghapusan API key terlebih dahulu.' });
		}
		try {
			await deleteAdminApiKey(event.locals.adminToken, event.fetch);
			return { action: 'remove', success: true, message: 'API key akun ini berhasil dihapus.' };
		} catch (err) {
			handleAdminAuthError(err, event.cookies);
			return fail(err?.status === 503 ? 503 : 500, { action: 'remove', error: err?.message || 'Gagal menghapus API key.' });
		}
	}
};
