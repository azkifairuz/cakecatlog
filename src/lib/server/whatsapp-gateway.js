import { PhoneNumberError, toWhatsAppDigits } from '../phone-number.js';

const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_MESSAGE_LENGTH = 60_000;
const SEND_URL = 'https://api.fonnte.com/send';

export class WhatsAppGatewayError extends Error {
	constructor(message, { code = 'GATEWAY_ERROR', status = 502, retryAfterSeconds = null } = {}) {
		super(message);
		this.name = 'WhatsAppGatewayError';
		this.code = code;
		this.status = status;
		this.retryAfterSeconds = retryAfterSeconds;
	}
}

export function normalizeWhatsAppNumber(value) {
	try {
		return toWhatsAppDigits(value);
	} catch (error) {
		if (!(error instanceof PhoneNumberError)) throw error;
		throw new WhatsAppGatewayError(
			'Nomor WhatsApp tidak valid. Gunakan nomor lokal Indonesia atau format internasional, contoh 081234567890 atau +60128190553.',
			{ code: 'INVALID_RECIPIENT', status: 400 }
		);
	}
}

export function createWhatsAppGateway({ token, fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }) {
	const normalizedToken = String(token ?? '').trim();

	if (!normalizedToken) {
		throw new WhatsAppGatewayError(
			'Konfigurasi Fonnte belum lengkap. Isi FONNTE_TOKEN di environment server.',
			{ code: 'CONFIGURATION_ERROR', status: 500 }
		);
	}

	async function request(body) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetchFn(SEND_URL, {
				method: 'POST',
				headers: { Authorization: normalizedToken },
				body,
				signal: controller.signal
			});
			const rawBody = await response.text();
			let result;
			try {
				result = JSON.parse(rawBody);
			} catch {
				// HTTP failures may contain a plain-text proxy response.
				if (response.ok) throw invalidResponse();
			}

			if (!response.ok) {
				const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
				throw new WhatsAppGatewayError('Permintaan ke Fonnte gagal.', {
					code: response.status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'GATEWAY_ERROR',
					status: response.status === 429 ? 429 : 502,
					retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : null
				});
			}

			if (!result || typeof result !== 'object' || Array.isArray(result)) throw invalidResponse();
			const success = result.status ?? result.Status;
			if (success === false) {
				throw sendError(result.reason || result.detail);
			}
			if (success !== true) throw invalidResponse();

			return result;
		} catch (error) {
			if (error instanceof WhatsAppGatewayError) throw error;
			if (error?.name === 'AbortError') {
				throw new WhatsAppGatewayError('Fonnte tidak merespons tepat waktu. Periksa WhatsApp sebelum mengirim ulang.', {
					code: 'GATEWAY_TIMEOUT',
					status: 504
				});
			}

			throw new WhatsAppGatewayError('Tidak dapat menghubungi Fonnte. Periksa WhatsApp sebelum mengirim ulang.', {
				code: 'GATEWAY_UNAVAILABLE',
				status: 502
			});
		} finally {
			clearTimeout(timeout);
		}
	}

	return {
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

			const body = new FormData();
			body.set('target', normalizeWhatsAppNumber(to));
			body.set('message', normalizedMessage);
			body.set('countryCode', '0');
			body.set('connectOnly', 'true');
			return request(body);
		}
	};
}

function invalidResponse() {
	return new WhatsAppGatewayError('Fonnte mengembalikan respons yang tidak valid.', {
		code: 'INVALID_GATEWAY_RESPONSE',
		status: 502
	});
}

function sendError(reason) {
	const normalizedReason = String(reason ?? '').trim().toLowerCase();
	const errors = {
		'token invalid': ['CONFIGURATION_ERROR', 500, 'Token Fonnte tidak valid. Periksa FONNTE_TOKEN di environment server.'],
		'device disconnected': ['NOT_CONNECTED', 503, 'WhatsApp belum terhubung. Hubungkan perangkat melalui dashboard Fonnte.'],
		'device not connected': ['NOT_CONNECTED', 503, 'WhatsApp belum terhubung. Hubungkan perangkat melalui dashboard Fonnte.'],
		'target invalid': ['INVALID_RECIPIENT', 400, 'Nomor WhatsApp penerima tidak valid.'],
		'input invalid': ['VALIDATION_ERROR', 400, 'Fonnte menolak data pengiriman pesan.'],
		'insufficient quota': ['QUOTA_EXCEEDED', 503, 'Kuota Fonnte tidak cukup. Tambahkan kuota melalui dashboard Fonnte.']
	};
	const [code, status, message] = (Object.hasOwn(errors, normalizedReason) ? errors[normalizedReason] : null) ?? [
		'SEND_FAILED', 502, 'Fonnte gagal memproses pesan. Periksa dashboard Fonnte.'
	];
	return new WhatsAppGatewayError(message, { code, status });
}
