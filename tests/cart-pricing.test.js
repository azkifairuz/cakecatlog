import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCartQuote, cartOrderItem, cartSelectionKey } from '../src/lib/cart-pricing.js';
import { setPriceNotice, takePriceNotice, priceWarningMessage } from '../src/lib/price-notice.js';

const item = (id = 'one') => ({ cartItemId: id, product_id: 'cake', product_variant_id: 'size', quantity: 1,
	price_at_order: 100000, estimated_unit_price: 100000, cake_text: `Text ${id}`, gift_card_text: 'Gift',
	reference_image_url: 'https://image.test/ref.jpg', customized_options: { private_note: 'Keep this', size: { variant_id: 'size', price: 100000 }, addons: [] } });
const quote = (price = 120000) => ({ productId: 'cake', productVariantId: 'size', quantity: 1, productName: 'Cake', cakeSize: 'Small',
	estimatedUnitPrice: price, estimatedSubtotal: price, sizePrice: price, basePrice: price, darkColorSurcharge: 0,
	hasCakeTopper: false, cakeTopperFee: 0, customizedOptions: { size: { name: 'Small', variant_id: 'size', price }, addons: [], cake_topper: { selected: false, price: 0 }, private_note: 'stale server value' } });

test('quote updates prices, preserves free values and retains distinct customization on duplicate products', () => {
	const current = [item('one'), item('two')];
	const updated = applyCartQuote(current, structuredClone(current), [quote(0), quote(150000)]);
	assert.equal(updated[0].estimated_unit_price, 0);
	assert.equal(updated[0].price_at_order, 0);
	assert.equal(updated[1].estimated_unit_price, 150000);
	assert.equal(updated[0].cake_text, 'Text one');
	assert.equal(updated[1].cake_text, 'Text two');
	assert.equal(updated[0].reference_image_url, current[0].reference_image_url);
	assert.equal(updated[0].gift_card_text, 'Gift');
	assert.equal(updated[0].customized_options.private_note, 'Keep this');
	assert.equal(updated[0].cartItemId, 'one');
	assert.equal(updated[1].cartItemId, 'two');
});
test('stale responses cannot overwrite quantity, selection changes, removed or reordered items', () => {
	const snapshot = [item('one'), item('two')];
	for (const current of [[{ ...item('one'), quantity: 2 }, item('two')], [item('two'), item('one')], [item('one')], [{ ...item('one'), product_variant_id: 'other' }, item('two')]]) {
		assert.equal(applyCartQuote(current, snapshot, [quote(), quote()]), null);
	}
	assert.equal(applyCartQuote([item()], [item()], [{ ...quote(), productId: 'wrong' }]), null);
	assert.equal(applyCartQuote([item()], [item()], [quote(NaN)]), null);
});
test('late price response preserves notes edited after the request; price-only changes do not trigger a new selection', () => {
	const snapshot = [item()]; const current = [{ ...item(), cake_text: 'New inscription', customized_options: { ...item().customized_options, private_note: 'New note' } }];
	const result = applyCartQuote(current, snapshot, [quote()]);
	assert.equal(result[0].cake_text, 'New inscription');
	assert.equal(result[0].customized_options.private_note, 'New note');
	assert.equal(cartSelectionKey(result), cartSelectionKey(snapshot));
});
test('checkout payload preserves topper ID and an explicitly zero price', () => {
	const payload = cartOrderItem({ ...item(), cake_topper_fee: 0, customized_options: { cake_topper: { selected: true, addon_id: 'topper', price: 50000 } } });
	assert.equal(payload.cakeTopperFee, 0);
	assert.equal(payload.customizedOptions.cake_topper.addon_id, 'topper');
});

function cookies() {
	const values = new Map(); const calls = [];
	return { values, calls, get: name => values.get(name), set(name, value, options) { values.set(name, value); calls.push(options); }, delete(name, options) { values.delete(name); calls.push(options); } };
}
const warning = { code: 'PRICE_UPDATED', previousTotal: 100000, newTotal: 120000 };
test('notice is scoped, HttpOnly and consumed once with amounts checked against actual order', () => {
	const jar = cookies(); setPriceNotice(jar, 'order', warning, 'en');
	assert.deepEqual(jar.calls[0], { path: '/order/receipt/order', httpOnly: true, sameSite: 'lax', maxAge: 300 });
	assert.equal(takePriceNotice(jar, 'other-order', 120000), null);
	assert.deepEqual(takePriceNotice(jar, 'order', 120000), { ...warning, locale: 'en' });
	assert.equal(takePriceNotice(jar, 'order', 120000), null);
	setPriceNotice(jar, 'order', warning);
	assert.equal(takePriceNotice(jar, 'order', 999), null);
});
test('expired/malformed notices are ignored and cookie failure cannot fail a successful order', () => {
	const jar = cookies(); setPriceNotice(jar, 'order', warning);
	const value = JSON.parse(jar.values.get('price_change_notice')); value.at -= 301000;
	jar.values.set('price_change_notice', JSON.stringify(value));
	assert.equal(takePriceNotice(jar, 'order', 120000), null);
	jar.values.set('price_change_notice', 'bad-json');
	assert.equal(takePriceNotice(jar, 'order', 120000), null);
	assert.doesNotThrow(() => setPriceNotice({ set() { throw Error('headers already sent'); } }, 'order', warning));
});
test('customer warnings describe updated totals and successful creation in both languages', () => {
	assert.match(priceWarningMessage(warning, 'id', true), /sudah dibuat menggunakan harga terbaru/);
	assert.match(priceWarningMessage(warning, 'en', true), /order was placed using the latest price/);
	assert.match(priceWarningMessage(warning, 'id'), /tetap bisa melanjutkan/);
	assert.equal(priceWarningMessage(null), '');
});
