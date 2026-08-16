import test from 'node:test';
import assert from 'node:assert/strict';
import {
	buildFixedProductAddonStates,
	getEffectiveSelectedAddonCount,
	getEffectiveSelectedAddonIds
} from '../src/lib/product-addon-selection.js';

const addons = [
	{ id: 'a', is_active: true },
	{ id: 'b', is_active: true },
	{ id: 'c', is_active: false }
];

test('initial selection preserves the effective global and override result', () => {
	assert.deepEqual(getEffectiveSelectedAddonIds(addons, { a: 'inactive', c: 'active' }), ['b', 'c']);
	assert.equal(getEffectiveSelectedAddonCount(addons, { a: 'inactive', c: 'active' }), 2);
});

test('fixed selection pins every global addon to active or inactive', () => {
	assert.deepEqual(buildFixedProductAddonStates(addons, ['a', 'c']), {
		a: 'active',
		b: 'inactive',
		c: 'active'
	});
});
