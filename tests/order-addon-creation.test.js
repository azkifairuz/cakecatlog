import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptAddon, adaptAddons, adaptProduct } from '../src/lib/api/adapters.js';

test('adaptAddons normalizes backend addons with additionalPrice and categories correctly', () => {
	const rawBackendAddons = [
		{
			id: 'addon-uuid-1',
			name: 'Lilin Angka Gold',
			category: 'Lilin',
			additionalPrice: 15000,
			isDarkColor: false,
			darkColorSurcharge: 0,
			isActive: true
		},
		{
			id: 'addon-uuid-2',
			name: 'Pita Satin Burgundy',
			category: 'Dekorasi',
			additionalPrice: '25000',
			isDarkColor: true,
			darkColorSurcharge: '5000',
			isActive: true
		},
		{
			id: 'addon-uuid-3',
			name: 'Pisau Kue Premium',
			category: 'Aksesoris',
			price: 10000,
			isActive: true
		}
	];

	const adapted = adaptAddons(rawBackendAddons);

	assert.equal(adapted.length, 3);
	
	// Item 1
	assert.equal(adapted[0].id, 'addon-uuid-1');
	assert.equal(adapted[0].name, 'Lilin Angka Gold');
	assert.equal(adapted[0].category, 'Lilin');
	assert.equal(adapted[0].additional_price, 15000);
	assert.equal(adapted[0].price, 15000);
	assert.equal(adapted[0].additionalPrice, 15000);
	assert.equal(adapted[0].is_active, true);

	// Item 2
	assert.equal(adapted[1].id, 'addon-uuid-2');
	assert.equal(adapted[1].additional_price, '25000');
	assert.equal(adapted[1].price, '25000');
	assert.equal(adapted[1].is_dark_color, true);
	assert.equal(adapted[1].dark_color_surcharge, '5000');

	// Item 3
	assert.equal(adapted[2].id, 'addon-uuid-3');
	assert.equal(adapted[2].additional_price, 10000);
	assert.equal(adapted[2].price, 10000);
});

test('filtering addons by search query and category behaves predictably', () => {
	const addons = [
		{ id: '1', name: 'Lilin Spiral', category: 'Lilin', additional_price: 5000 },
		{ id: '2', name: 'Lilin Angka', category: 'Lilin', additional_price: 10000 },
		{ id: '3', name: 'Topper Akrilik HBD', category: 'Topper', additional_price: 25000 },
		{ id: '4', name: 'Pita Pastel Blue', category: 'Dekorasi', additional_price: 15000 }
	];

	// Filter category = 'Lilin'
	const lilinCategory = addons.filter((a) => a.category.toLowerCase() === 'lilin');
	assert.equal(lilinCategory.length, 2);

	// Filter search = 'pita'
	const searchPita = addons.filter(
		(a) => a.name.toLowerCase().includes('pita') || a.category.toLowerCase().includes('pita')
	);
	assert.equal(searchPita.length, 1);
	assert.equal(searchPita[0].name, 'Pita Pastel Blue');

	// Filter search in category
	const searchSpiralInLilin = addons.filter(
		(a) =>
			a.category.toLowerCase() === 'lilin' &&
			(a.name.toLowerCase().includes('spiral') || a.category.toLowerCase().includes('spiral'))
	);
	assert.equal(searchSpiralInLilin.length, 1);
	assert.equal(searchSpiralInLilin[0].id, '1');
});

test('calculate selected addon prices and order total correctly', () => {
	const addons = [
		{ id: '1', name: 'Lilin Spiral', additional_price: 5000 },
		{ id: '2', name: 'Topper Akrilik', additional_price: 25000 },
		{ id: '3', name: 'Kartu Ucapan', additional_price: 0 }
	];

	const selectedIds = ['1', '2'];
	const selectedAddons = addons.filter((a) => selectedIds.includes(a.id));
	
	const addonsUnitPrice = selectedAddons.reduce(
		(sum, a) => sum + Number(a.additional_price || a.price || 0),
		0
	);
	assert.equal(addonsUnitPrice, 30000);

	const baseUnitPrice = 150000;
	const quantity = 2;
	const deliveryFee = 15000;

	const calculatedCakePrice = (baseUnitPrice + addonsUnitPrice) * quantity;
	assert.equal(calculatedCakePrice, 360000);

	const totalAmount = calculatedCakePrice + deliveryFee;
	assert.equal(totalAmount, 375000);
});
