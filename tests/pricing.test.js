import test from 'node:test';
import assert from 'node:assert/strict';
import {
	getAddonSelectionPrice,
	getDynamicAddonGroups,
	getProductAddons,
	normalizeCategoryKey
} from '../src/lib/pricing.js';

const globalAddons = [
	{ id: 'a', category: 'Artificial Flower', name: 'Lily Calla', additional_price: 10000, is_active: true },
	{ id: 'b', category: 'Artificial Flower', name: 'Lily Stargazer', additional_price: 20000, is_active: true },
	{ id: 'c', category: 'Glitter', name: 'Gold', additional_price: 5000, is_active: false }
];

test('normalizes category labels for stable grouping', () => {
	assert.equal(normalizeCategoryKey(' Artificial-Flower '), 'artificial_flower');
});

test('inherits global status when there is no product override', () => {
	assert.deepEqual(getProductAddons({ global_addons: globalAddons }).map((addon) => addon.id), ['a', 'b']);
});

test('product overrides win over global active and inactive states', () => {
	const product = {
		global_addons: globalAddons,
		product_addons: [
			{ addon_id: 'a', is_active: false },
			{ addon_id: 'c', is_active: true }
		]
	};
	assert.deepEqual(getProductAddons(product).map((addon) => addon.id), ['b', 'c']);
});

test('dynamic groups preserve the display label and include custom categories', () => {
	const groups = getDynamicAddonGroups({ global_addons: globalAddons });
	assert.equal(groups[0].key, 'artificial_flower');
	assert.equal(groups[0].label, 'Artificial Flower');
	assert.equal(groups[0].addons.length, 2);
});

test('selection price includes dark color surcharge', () => {
	assert.equal(getAddonSelectionPrice({ additional_price: 1000, is_dark_color: true, dark_color_surcharge: 2500 }), 3500);
});
