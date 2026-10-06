import { env } from '$env/dynamic/private';
import { createWhatsAppGateway } from './whatsapp-gateway.js';

export function getWhatsAppGateway() {
	return createWhatsAppGateway({
		token: env.FONNTE_TOKEN
	});
}
