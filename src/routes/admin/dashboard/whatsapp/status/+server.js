import { json } from '@sveltejs/kit';
import { WhatsAppGatewayError } from '$lib/server/whatsapp-gateway.js';
import { getWhatsAppGateway } from '$lib/server/whatsapp-gateway.server.js';

export async function GET() {
	try {
		return json(await getWhatsAppGateway().getStatus(), {
			headers: { 'Cache-Control': 'no-store' }
		});
	} catch (error) {
		console.error('WhatsApp status error:', error);
		const status = error instanceof WhatsAppGatewayError ? error.status : 502;
		const headers = { 'Cache-Control': 'no-store' };
		if (error instanceof WhatsAppGatewayError && error.retryAfterSeconds) {
			headers['Retry-After'] = String(error.retryAfterSeconds);
		}
		return json(
			{
				status: 'error',
				qr: null,
				message: error instanceof WhatsAppGatewayError ? error.message : 'Tidak dapat menghubungi WhatsApp gateway.'
			},
			{ status, headers }
		);
	}
}
