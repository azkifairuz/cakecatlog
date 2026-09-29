import { json } from '@sveltejs/kit';
import { getAdminWhatsAppStatus } from '$lib/api/admin.js';
import { isAuthError } from '$lib/api/auth.js';

export async function GET({ locals, fetch, cookies }) {
	try {
		const status = await getAdminWhatsAppStatus(locals.adminToken, fetch);
		return json(status, {
			headers: { 'Cache-Control': 'no-store' }
		});
	} catch (error) {
		if (isAuthError(error)) {
			cookies.delete('admin_access_token', { path: '/' });
			return json(
				{
					status: 'unauthorized',
					qr: null,
					message: 'Sesi login telah berakhir.'
				},
				{ status: 401, headers: { 'Cache-Control': 'no-store' } }
			);
		}
		console.error('WhatsApp status error:', error);
		const status = error?.status || 502;
		const headers = { 'Cache-Control': 'no-store' };
		return json(
			{
				status: 'error',
				qr: null,
				message: error?.message || 'Tidak dapat menghubungi WhatsApp gateway.'
			},
			{ status, headers }
		);
	}
}
