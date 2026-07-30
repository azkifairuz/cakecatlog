import { fail } from '@sveltejs/kit';
import { WhatsAppGatewayError } from '$lib/server/whatsapp-gateway.js';
import { getWhatsAppGateway } from '$lib/server/whatsapp-gateway.server.js';

function unavailableState(error) {
	return {
		status: 'error',
		qr: null,
		message:
			error instanceof WhatsAppGatewayError
				? error.message
				: 'Tidak dapat menghubungi WhatsApp gateway.'
	};
}

export async function load() {
	try {
		return { whatsapp: await getWhatsAppGateway().getQrState() };
	} catch (error) {
		console.error('WhatsApp QR state error:', error);
		return { whatsapp: unavailableState(error) };
	}
}

export const actions = {
	logout: async () => {
		try {
			await getWhatsAppGateway().logout();
			return { success: true };
		} catch (error) {
			console.error('WhatsApp logout error:', error);
			return fail(error instanceof WhatsAppGatewayError ? error.status : 502, {
				success: false,
				message: unavailableState(error).message
			});
		}
	}
};
