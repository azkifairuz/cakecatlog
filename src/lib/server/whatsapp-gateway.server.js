import { env } from '$env/dynamic/private';
import { createWhatsAppGateway } from './whatsapp-gateway.js';

export function getWhatsAppGateway() {
	return createWhatsAppGateway({
		baseUrl: env.WA_GATEWAY_URL,
		apiKey: env.WA_GATEWAY_API_KEY
	});
}
