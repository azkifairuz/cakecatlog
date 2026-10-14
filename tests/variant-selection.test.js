import test from 'node:test';
import assert from 'node:assert/strict';
import { getSizePriceOptions, getSizePrice, getStartFromPrice, BASE_SIZE_ID, parsePrice } from '../src/lib/pricing.js';
import { cartVariantId, hasCartVariantSelection } from '../src/lib/cart-variants.js';
const product = { base_price: 550000, product_variants: [
	{ id: 'v10', name: '10 cm', price: 550000 },
	{ id: 'v12', name: '12 cm', price: 700000 },
	{ id: 'hidden', name: 'Inactive', price: 1000, is_active: false }
] };
test('size selection uses IDs and keeps labels separate', () => {
	assert.deepEqual(getSizePriceOptions(product).map(({ id, label }) => ({ id, label })), [{ id: 'v10', label: '10 cm' }, { id: 'v12', label: '12 cm' }]);
	assert.equal(getSizePrice(product, 'v12'), 700000);
	assert.equal(getSizePrice({ ...product, product_variants: product.product_variants.map((v) => ({ ...v, name: 'Same label' })) }, 'v12'), 700000);
	for (const key of ['12cm', '12 cm', '12 CM', 'hidden', 'missing', '']) assert.throws(() => getSizePrice(product, key));
	assert.equal(getStartFromPrice(product), 550000);
});
test('products without variants have a base option; inactive variants never fall back to base', () => {
	assert.equal(getSizePrice({ base_price: 550000 }, BASE_SIZE_ID), 550000);
	assert.deepEqual(getSizePriceOptions({ base_price: 550000, product_variants: [{ id: 'v', name: '12 cm', is_active: false }] }), []);
});
test('legacy carts must have a real variant ID or be a new explicit base-price selection', () => {
	assert.equal(hasCartVariantSelection({ cake_size: '12cm', price_at_order: 550000 }), false);
	assert.equal(hasCartVariantSelection({ product_variant_id: 'v12' }), true);
	assert.equal(cartVariantId({ customized_options: { size: { variant_id: 'v12', name: 'Renamed' } } }), 'v12');
	assert.equal(hasCartVariantSelection({ variant_selection_version: 1, requires_variant: false }), true);
	assert.equal(hasCartVariantSelection({ variant_selection_version: 1, requires_variant: true }), false);
});

test('backend numeric prices preserve decimal formatting', () => { assert.equal(parsePrice('700000.00'), 700000); assert.equal(parsePrice('700,000'), 700000); });

// Exercise the real checkout action with its public API call replaced by a recorder.
const { readFile } = await import('node:fs/promises');
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const dependencies = {
	'$lib/cart-variants.js': new URL('../src/lib/cart-variants.js', import.meta.url).href,
	'$lib/i18n.svelte.js': dataUrl('export const normalizeLocale = () => "id"; export const translate = (_, key) => key;'),
	'$lib/phone-number.js': new URL('../src/lib/phone-number.js', import.meta.url).href,
	'$lib/api/public.js': dataUrl('export async function submitCheckoutOrder(payload) { globalThis.variantTestPayload = payload; return { id: "order-test" }; }'),
	'@sveltejs/kit': dataUrl('export const fail = (status, data) => ({ status, data });')
};
const actionSource = await readFile(new URL('../src/routes/checkout/+page.server.js', import.meta.url), 'utf8');
const { actions } = await import(dataUrl(actionSource.replace(/from '([^']+)'/g, (_, path) => `from '${dependencies[path]}'`)));
function checkoutEvent(items) {
	const form = new FormData();
	for (const [name, value] of Object.entries({ customer_name: 'Test', email: 'test@example.com', phone_number: '081511111111', phone_country: 'ID', delivery_option: 'pickup', delivery_date: '2026-12-01', delivery_time: '12:00', cart_items: JSON.stringify(items), total_price: '1400000' })) form.set(name, value);
	return { request: new Request('http://localhost/checkout', { method: 'POST', body: form }) };
}
test('checkout forwards the selected ID unchanged rather than looking up its label', async () => {
	const result = await actions.checkout(checkoutEvent([{ product_id: 'product', product_variant_id: 'v12', cake_size: 'arbitrary display label', quantity: 2 }]));
	assert.equal(result.success, true);
	assert.equal(globalThis.variantTestPayload.items[0].productVariantId, 'v12');
	assert.equal(globalThis.variantTestPayload.expectedTotal, 1400000);
});
test('checkout refuses a legacy label-only cart before calling the API', async () => {
	globalThis.variantTestPayload = null;
	const result = await actions.checkout(checkoutEvent([{ product_id: 'product', cake_size: '12cm', price_at_order: 550000 }]));
	assert.equal(result.status, 422);
	assert.equal(result.data.success, false);
	assert.equal(globalThis.variantTestPayload, null);
});
