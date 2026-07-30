const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_MESSAGE_LENGTH = 4_096;

export class WhatsAppGatewayError extends Error {
	constructor(message, { code = 'GATEWAY_ERROR', status = 502, retryAfterSeconds = null } = {}) {
		super(message);
		this.name = 'WhatsAppGatewayError';
		this.code = code;
		this.status = status;
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

export function normalizeIndonesianWhatsAppNumber(value) {
	const input = String(value ?? '').trim();
	if (!input || !/^\+?[\d\s()-]+$/.test(input)) {
		throw new WhatsAppGatewayError('Format nomor WhatsApp pelanggan tidak valid.', {
			code: 'INVALID_RECIPIENT',
			status: 400
		});
	}

	let digits = input.replace(/\D/g, '');
	if (digits.startsWith('0')) {
		digits = `62${digits.slice(1)}`;
	}

	if (!digits.startsWith('62') || !/^\d{8,15}$/.test(digits)) {
		throw new WhatsAppGatewayError(
			'Nomor WhatsApp harus menggunakan format Indonesia, contoh 081234567890 atau +6281234567890.',
			{ code: 'INVALID_RECIPIENT', status: 400 }
		);
	}

	return digits;
}

export function createWhatsAppGateway({ baseUrl, apiKey, fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
	const normalizedBaseUrl = String(baseUrl ?? '').trim().replace(/\/$/, '');
	const normalizedApiKey = String(apiKey ?? '').trim();

	if (!normalizedBaseUrl || !normalizedApiKey) {
		throw new WhatsAppGatewayError(
			'Konfigurasi WhatsApp gateway belum lengkap. Isi WA_GATEWAY_URL dan WA_GATEWAY_API_KEY.',
			{ code: 'CONFIGURATION_ERROR', status: 500 }
		);
	}

	async function request(path, options = {}) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetchFn(`${normalizedBaseUrl}${path}`, {
				...options,
				headers: {
					Authorization: `Bearer ${normalizedApiKey}`,
					...options.headers
				},
				signal: controller.signal
			});
			const rawBody = await response.text();
			let body = {};

			if (rawBody) {
				try {
					body = JSON.parse(rawBody);
				} catch {
					throw new WhatsAppGatewayError('Gateway mengembalikan respons yang tidak valid.', {
						code: 'INVALID_GATEWAY_RESPONSE',
						status: 502
					});
				}
			}

			if (!response.ok) {
				const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
				throw new WhatsAppGatewayError(body.message || 'Permintaan ke WhatsApp gateway gagal.', {
					code: body.error || 'GATEWAY_ERROR',
					status: response.status,
					retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null
				});
			}

			return body;
		} catch (error) {
			if (error instanceof WhatsAppGatewayError) throw error;
			if (error?.name === 'AbortError') {
				throw new WhatsAppGatewayError('WhatsApp gateway tidak merespons tepat waktu.', {
					code: 'GATEWAY_TIMEOUT',
					status: 504
				});
			}

			throw new WhatsAppGatewayError('Tidak dapat menghubungi WhatsApp gateway.', {
				code: 'GATEWAY_UNAVAILABLE',
				status: 502
			});
		} finally {
			clearTimeout(timeout);
		}
	}

	return {
		getQrState: () => request('/api/whatsapp/qr'),
		getStatus: () => request('/api/whatsapp/status'),
		logout: () => request('/api/whatsapp/logout', { method: 'POST' }),
		async sendTextMessage({ to, message }) {
			const normalizedMessage = String(message ?? '');
			if (!normalizedMessage.trim()) {
				throw new WhatsAppGatewayError('Isi pesan WhatsApp tidak boleh kosong.', {
					code: 'VALIDATION_ERROR',
					status: 400
				});
			}
			if (normalizedMessage.length > MAX_MESSAGE_LENGTH) {
				throw new WhatsAppGatewayError('Invoice terlalu panjang untuk dikirim melalui WhatsApp.', {
					code: 'VALIDATION_ERROR',
					status: 400
				});
			}

			return request('/api/whatsapp/messages', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: normalizeIndonesianWhatsAppNumber(to),
					message: normalizedMessage
				})
			});
		}
	};
}
