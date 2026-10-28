import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const id = 'b61ef96f-a125-4978-a2d7-50ef0b294054';
const variantId = '166cf0a6-d0a6-42f5-9c0d-903e7192bdb2';
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const source = await readFile(new URL('../src/routes/admin/dashboard/orders/+page.server.js', import.meta.url), 'utf8');
const names = source.match(/import\s*\{([^}]+)\}\s*from '\$lib\/api\/admin.js'/)[1].split(',').map((name) => name.trim());
const api = moduleUrl(names.map((name) => {
	if (name === 'getAdminProduct') return `export async function ${name}(id, token, fetch) {
		globalThis.sizeDetailCall = { id, token, fetch };
		if (globalThis.sizeDetailError) throw globalThis.sizeDetailError;
		return { id, name: 'Bow & Co.', basePrice: '550000', variants: [{ id: '${variantId}', name: '12 cm', price: '700000', isActive: true }], addons: [] };
	}`;
	if (name === 'createAdminOrder') return `export async function ${name}(payload, token) { globalThis.sizeCreateCall = { payload, token }; return { id: 'new-order' }; }`;
	return `export async function ${name}() {}`;
}).join('\n'));
const dependencies = {
	'@sveltejs/kit': moduleUrl('export const fail = (status, data) => ({ status, data }); export const error = () => {};'),
	'$lib/api/admin.js': api,
	'$lib/api/adapters.js': new URL('../src/lib/api/adapters.js', import.meta.url).href,
	'$lib/server/admin-orders.js': new URL('../src/lib/server/admin-orders.js', import.meta.url).href,
	'$lib/api/auth.js': moduleUrl('export const handleAdminAuthError = (error) => { if (error.status === 401) throw new Error("SESSION_EXPIRED"); };'),
	'$lib/server/delivery-proof-action.js': moduleUrl('export const uploadDeliveryProofAction = () => {};')
};
const { actions } = await import(moduleUrl(source.replace(/from '([^']+)'/g, (_, path) => {
	assert.ok(dependencies[path], path); return `from '${dependencies[path]}'`;
})));
const event = (fields) => {
	const form = new FormData();
	for (const [key, value] of Object.entries(fields)) form.set(key, value);
	return { request: new Request('http://localhost/admin/dashboard/orders', { method: 'POST', body: form }), locals: { adminToken: 'cookie-token' }, fetch: () => {}, cookies: {} };
};
test('product details action loads variants with the cookie session and normalizes display fields', async () => {
	globalThis.sizeDetailError = null;
	const input = event({ productId: id });
	const result = await actions.productDetails(input);
	assert.equal(result.success, true);
	assert.equal(globalThis.sizeDetailCall.token, 'cookie-token');
	assert.equal(globalThis.sizeDetailCall.fetch, input.fetch);
	assert.equal(result.product.variants[0].id, variantId);
	assert.equal(result.product.variants[0].name, '12 cm');
	assert.equal(result.product.variants[0].is_active, true);
});
test('invalid product ID is rejected before querying the API', async () => {
	globalThis.sizeDetailCall = null;
	const result = await actions.productDetails(event({ productId: '12 cm' }));
	assert.equal(result.status, 400);
	assert.equal(globalThis.sizeDetailCall, null);
});
test('detail failures return an error and expired sessions delegate to auth handling', async () => {
	globalThis.sizeDetailError = Object.assign(new Error('Detail unavailable'), { status: 503 });
	const result = await actions.productDetails(event({ productId: id }));
	assert.equal(result.status, 503);
	assert.equal(result.data.error, 'Detail unavailable');
	globalThis.sizeDetailError = Object.assign(new Error('Unauthorized'), { status: 401 });
	await assert.rejects(actions.productDetails(event({ productId: id })), /SESSION_EXPIRED/);
	globalThis.sizeDetailError = null;
});
test('create action forwards the selected variant ID and preserves the manual price override', async () => {
	const result = await actions.createOrder(event({ customerName: 'Test', phoneNumber: '081511111111', deliveryOption: 'pickup', deliveryDate: '2026-12-01', deliveryTime: '12:00', productId: id, productVariantId: variantId, quantity: '1', cakePrice: '650000', amount: '650000' }));
	assert.equal(result.success, true);
	assert.equal(globalThis.sizeCreateCall.payload.productVariantId, variantId);
	assert.equal(globalThis.sizeCreateCall.payload.product_variant_id, variantId);
	assert.equal(globalThis.sizeCreateCall.payload.cakePrice, 650000);
});

const validManualOrder = {
	customerName: 'Test', phoneNumber: '081511111111', deliveryOption: 'pickup',
	deliveryDate: '2024-03-01', deliveryTime: '12:00', productId: id
};

test('admin create forwards a historical order date separately from delivery date', async () => {
	const result = await actions.createOrder(event({ ...validManualOrder, orderDate: '2024-02-29' }));
	assert.equal(result.success, true);
	assert.equal(globalThis.sizeCreateCall.payload.orderDate, '2024-02-29');
	assert.equal(globalThis.sizeCreateCall.payload.deliveryDate, '2024-03-01');
});

test('admin create leaves omitted order date to the backend clock', async () => {
	await actions.createOrder(event(validManualOrder));
	assert.equal(globalThis.sizeCreateCall.payload.orderDate, undefined);
});

test('admin create rejects impossible dates, timestamps, and future dates before calling API', async () => {
	for (const orderDate of ['2025-02-29', '2024-04-31', '0000-01-01', '2024-02-29T00:00:00Z', '9999-12-31']) {
		globalThis.sizeCreateCall = null;
		const result = await actions.createOrder(event({ ...validManualOrder, orderDate }));
		assert.equal(result.status, 400, orderDate);
		assert.match(result.data.error, /Tanggal order/);
		assert.equal(globalThis.sizeCreateCall, null);
	}
});

test('date validation uses the Jakarta calendar day around UTC midnight', async () => {
	const { validateAdminOrderDate } = await import('../src/lib/server/admin-orders.js');
	const now = new Date('2026-10-28T18:00:00Z');
	assert.equal(validateAdminOrderDate('2026-10-29', now), '2026-10-29');
	assert.throws(() => validateAdminOrderDate('2026-10-30', now), /tidak boleh melebihi/);
});
