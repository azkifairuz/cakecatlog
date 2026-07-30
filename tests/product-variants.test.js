import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductVariantRows } from '../src/lib/product-variants.js';

test('separates existing and new variants and assigns IDs to new rows', () => {
	let generatedId = 0;
	const result = buildProductVariantRows('product-1', [
		{ id: 'variant-1', name: '10cm', price: 100000, is_active: true, display_order: 0 },
		{ id: null, name: '12cm', price: 150000, is_active: true, display_order: 1 }
	], () => `generated-${++generatedId}`);

	assert.equal(result.existingVariantRows[0].id, 'variant-1');
	assert.equal(result.newVariantRows[0].id, 'generated-1');
	assert.equal(result.newVariantRows[0].product_id, 'product-1');
	assert.equal(result.newVariantRows[0].id === null, false);
});
