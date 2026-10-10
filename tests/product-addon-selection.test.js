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

test('initial selection only includes explicit active product addons', () => {
	assert.deepEqual(getEffectiveSelectedAddonIds(addons, { a: 'inactive', c: 'active' }), ['c']);
	assert.equal(getEffectiveSelectedAddonCount(addons, { a: 'inactive', c: 'active' }), 1);
	assert.deepEqual(getEffectiveSelectedAddonIds(addons, {}), []);
});

test('fixed selection pins every global addon to active or inactive', () => {
	assert.deepEqual(buildFixedProductAddonStates(addons, ['a', 'c']), {
		a: 'active',
		b: 'inactive',
		c: 'active'
	});
});
