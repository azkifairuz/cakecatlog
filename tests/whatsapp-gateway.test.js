import assert from 'node:assert/strict';
import test from 'node:test';
import {
	WhatsAppGatewayError,
	createWhatsAppGateway,
	normalizeWhatsAppNumber
} from '../src/lib/server/whatsapp-gateway.js';

test('normalizes supported local and international WhatsApp number formats', () => {
	assert.equal(normalizeWhatsAppNumber('0812-3456-7890'), '6281234567890');
	assert.equal(normalizeWhatsAppNumber('+62 812 3456 7890'), '6281234567890');
	assert.equal(normalizeWhatsAppNumber('6281234567890'), '6281234567890');
	assert.equal(normalizeWhatsAppNumber('+60 12-819 0553'), '60128190553');
	assert.equal(normalizeWhatsAppNumber('60128190553'), '60128190553');
});

test('rejects invalid recipients', () => {
	assert.throws(() => normalizeWhatsAppNumber('customer@example.com'), {
		name: 'WhatsAppGatewayError',
		code: 'INVALID_RECIPIENT'
	});
	assert.throws(() => normalizeWhatsAppNumber('1234'), {
		name: 'WhatsAppGatewayError',
		code: 'INVALID_RECIPIENT'
	});
});

test('sends messages using the new Bearer API contract', async () => {
	let capturedRequest;
	const gateway = createWhatsAppGateway({
		baseUrl: 'https://wa.example.com/',
		apiKey: 'wag_test_key',
		fetchFn: async (url, options) => {
			capturedRequest = { url, options };
			return Response.json(
				{
					id: 'message-id',
					to: '6281234567890@s.whatsapp.net',
					status: 'delivered',
					deliveredAt: '2026-07-30T00:00:00.000Z'
				},
				{ status: 201 }
			);
		}
	});

	const result = await gateway.sendTextMessage({ to: '081234567890', message: 'Invoice' });

	assert.equal(capturedRequest.url, 'https://wa.example.com/api/whatsapp/messages');
	assert.equal(capturedRequest.options.method, 'POST');
	assert.equal(capturedRequest.options.headers.Authorization, 'Bearer wag_test_key');
	assert.deepEqual(JSON.parse(capturedRequest.options.body), {
		to: '6281234567890',
		message: 'Invoice'
	});
	assert.equal(result.status, 'delivered');
	assert.equal(result.deliveredAt, '2026-07-30T00:00:00.000Z');
});

test('preserves the new recipient and delivery error codes', async () => {
	for (const [code, status] of [
		['RECIPIENT_NOT_REGISTERED', 422],
		['RECIPIENT_LOOKUP_FAILED', 502],
		['DELIVERY_FAILED', 502],
		['DELIVERY_TIMEOUT', 504]
	]) {
		const gateway = createWhatsAppGateway({
			baseUrl: 'https://wa.example.com',
			apiKey: 'wag_test_key',
			fetchFn: async () => Response.json({ error: code, message: `Error ${code}` }, { status })
		});

		await assert.rejects(
			gateway.sendTextMessage({ to: '08515519213', message: 'Invoice' }),
			(error) => error instanceof WhatsAppGatewayError && error.code === code && error.status === status
		);
	}
});

test('maps gateway errors and Retry-After metadata', async () => {
	const gateway = createWhatsAppGateway({
		baseUrl: 'https://wa.example.com',
		apiKey: 'wag_test_key',
		fetchFn: async () =>
			Response.json(
				{ error: 'RATE_LIMIT_EXCEEDED', message: 'Terlalu banyak request' },
				{ status: 429, headers: { 'Retry-After': '42' } }
			)
	});

	await assert.rejects(
		gateway.getStatus(),
		(error) =>
			error instanceof WhatsAppGatewayError &&
			error.code === 'RATE_LIMIT_EXCEEDED' &&
			error.status === 429 &&
			error.retryAfterSeconds === 42
	);
});

test('rejects messages above the gateway limit without sending', async () => {
	let requestCount = 0;
	const gateway = createWhatsAppGateway({
		baseUrl: 'https://wa.example.com',
		apiKey: 'wag_test_key',
		fetchFn: async () => {
			requestCount += 1;
			return Response.json({});
		}
	});

	await assert.rejects(gateway.sendTextMessage({ to: '081234567890', message: 'a'.repeat(4_097) }), {
		code: 'VALIDATION_ERROR',
		status: 400
	});
	assert.equal(requestCount, 0);
});

test('rejects non-JSON gateway responses', async () => {
	const gateway = createWhatsAppGateway({
		baseUrl: 'https://wa.example.com',
		apiKey: 'wag_test_key',
		fetchFn: async () => new Response('upstream proxy error', { status: 502 })
	});

	await assert.rejects(gateway.getQrState(), {
		code: 'INVALID_GATEWAY_RESPONSE',
		status: 502
	});
});
