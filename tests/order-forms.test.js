import test from 'node:test';
import assert from 'node:assert/strict';
import {
	slugify,
	buildFormUrl,
	buildWhatsAppShareMessage
} from '../src/lib/order-forms.js';

test('slugify converts titles to valid clean URL slugs', () => {
	assert.equal(slugify('Kue Ulang Tahun & Anniversary #1'), 'kue-ulang-tahun-anniversary-1');
	assert.equal(slugify('  Promo Spesial 2026!  '), 'promo-spesial-2026');
	assert.equal(slugify('Crème Brûlée Deluxe'), 'creme-brulee-deluxe');
	assert.equal(slugify('---multiple---dashes---'), 'multiple-dashes');
});

test('buildFormUrl builds clean shareable URLs with query parameters', () => {
	const origin = 'https://dessertbyfir.com';
	assert.equal(buildFormUrl(origin, '/order-form'), 'https://dessertbyfir.com/order-form');
	assert.equal(
		buildFormUrl(origin, 'order-form', { product: 'cake-123' }),
		'https://dessertbyfir.com/order-form?product=cake-123'
	);
	assert.equal(
		buildFormUrl(origin, '/form/promo-lebaran', { ref: 'instagram', empty: '' }),
		'https://dessertbyfir.com/form/promo-lebaran?ref=instagram'
	);
});

test('buildWhatsAppShareMessage produces a clear and actionable message', () => {
	const msg = buildWhatsAppShareMessage(
		{ whatsapp_number: '08123456789' },
		{
			formUrl: 'https://dessertbyfir.com/order-form?product=abc',
			productName: 'Lily Bow Cake'
		}
	);

	assert.ok(msg.includes('Lily Bow Cake'));
	assert.ok(msg.includes('https://dessertbyfir.com/order-form?product=abc'));
	assert.ok(msg.includes('dessertbyfir'));
});
