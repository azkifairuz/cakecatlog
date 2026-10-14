import { error, fail, redirect } from '@sveltejs/kit';
import { getExpenseWhatsAppConfig, updateExpenseWhatsAppConfig } from '$lib/api/expense-whatsapp.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
import { canManageExpenseWhatsApp, normalizeExpenseSender } from '$lib/expense-whatsapp.js';

function requireAccess({ locals, setHeaders }) {
	setHeaders({ 'cache-control': 'private, no-store' });
	if (!locals.adminToken) redirect(303, '/admin/login');
	if (!locals.adminUser) error(503, 'Akun admin belum dapat dimuat. Silakan coba lagi.');
	if (!canManageExpenseWhatsApp(locals.adminUser)) error(403, 'Anda tidak memiliki izin mengelola pengeluaran.');
}

export async function load(event) {
	requireAccess(event);
	try {
		return { config: await getExpenseWhatsAppConfig(event.locals.adminToken, event.fetch), loadError: null };
	} catch (err) {
		handleAdminAuthError(err, event.cookies);
		if (err?.status === 403) error(403, 'Anda tidak memiliki izin mengelola pengeluaran.');
		return { config: null, loadError: err?.message || 'Konfigurasi belum dapat dimuat. Silakan coba lagi.' };
	}
}

export const actions = {
	save: async (event) => {
		requireAccess(event);
		const form = await event.request.formData();
		const values = { senderNumber: String(form.get('senderNumber') ?? '').trim(), enabled: form.get('enabled') === 'on' };
		let senderNumber;
		try { senderNumber = normalizeExpenseSender(values.senderNumber); }
		catch (err) { return fail(422, { error: err.message, values }); }
		try {
			const config = await updateExpenseWhatsAppConfig({ senderNumber, enabled: values.enabled }, event.locals.adminToken, event.fetch);
			if (!config?.senderNumber || typeof config.enabled !== 'boolean') {
				return fail(502, { error: 'Respons konfigurasi tidak lengkap. Muat ulang untuk memastikan hasil penyimpanan.', values });
			}
			return { success: true, config, message: 'Konfigurasi WhatsApp pengeluaran berhasil disimpan.' };
		} catch (err) {
			handleAdminAuthError(err, event.cookies);
			return fail([403, 422, 429, 502, 503].includes(err?.status) ? err.status : 500, {
				error: err?.message || 'Gagal menyimpan konfigurasi. Silakan coba lagi.', values
			});
		}
	}
};
