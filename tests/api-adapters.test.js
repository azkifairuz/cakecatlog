import test from 'node:test';
import assert from 'node:assert/strict';
import {
	adaptProduct,
	adaptProducts,
	adaptAddon,
	adaptOrderForm,
	adaptOrder,
	adaptOrders
} from '../src/lib/api/adapters.js';

test('adaptProduct maps backend camelCase product to frontend expected format', () => {
	const backendProduct = {
		id: 'prod-123',
		name: 'Matcha Cake',
		slug: 'matcha-cake',
		basePrice: 150000,
		description: 'Delicious cake',
		handlingWarning: 'Keep refrigerated',
		isActive: true,
		isAvailable: true,
		category: { id: 'cat-1', name: 'Signature Cakes', slug: 'signature' },
		variants: [
			{ id: 'v-1', name: '16 cm', price: 150000, isActive: true, displayOrder: 1 },
			{ id: 'v-2', name: '20 cm', price: 200000, isActive: true, displayOrder: 2 }
		],
		addons: [
			{ addonId: 'add-1', isActive: true, addon: { id: 'add-1', name: 'Candle', price: 5000 } }
		],
		images: [
			{ id: 'img-1', imageUrl: 'https://example.com/matcha.jpg', isPrimary: true }
		]
	};

	const adapted = adaptProduct(backendProduct);

	assert.equal(adapted.id, 'prod-123');
	assert.equal(adapted.name, 'Matcha Cake');
	assert.equal(adapted.base_price, 150000);
	assert.equal(adapted.image_url, 'https://example.com/matcha.jpg');
	assert.equal(adapted.is_active, true);
	assert.equal(adapted.is_available, true);
	assert.equal(adapted.categories?.name, 'Signature Cakes');
	assert.equal(adapted.product_variants.length, 2);
	assert.equal(adapted.product_variants[0].name, '16 cm');
	assert.equal(adapted.product_addons.length, 1);
	assert.equal(adapted.product_addons[0].addon_id, 'add-1');
});

test('adaptProduct maps direct flat addons from backend GET /products/:id', () => {
	const backendProduct = {
		id: 'prod-456',
		name: 'Bento Cake',
		basePrice: '150000',
		isAvailable: true,
		addons: [
			{
				id: 'add-99',
				addonId: 'add-99',
				category: 'Lilin',
				name: 'Lilin Spiral Gold',
				additionalPrice: '5000',
				isDarkColor: false,
				darkColorSurcharge: '0',
				isActive: true
			}
		],
		images: [
			{ id: 'img-1', imageUrl: 'https://example.com/bento.jpg', isPrimary: true }
		]
	};

	const adapted = adaptProduct(backendProduct);

	assert.equal(adapted.id, 'prod-456');
	assert.equal(adapted.name, 'Bento Cake');
	assert.equal(adapted.addons.length, 1);
	assert.equal(adapted.addons[0].id, 'add-99');
	assert.equal(adapted.addons[0].addonId, 'add-99');
	assert.equal(adapted.addons[0].name, 'Lilin Spiral Gold');
	assert.equal(adapted.addons[0].category, 'Lilin');
	assert.equal(adapted.addons[0].additionalPrice, '5000');
	assert.equal(adapted.addons[0].additional_price, '5000');
	assert.equal(adapted.addons[0].is_active, true);
	assert.equal(adapted.addons[0].isActive, true);
});

test('adaptProduct resolves primaryImageUrl to image_url and product_images when images array is not present', () => {
	const backendProduct = {
		id: 'prod-789',
		name: 'Rosalie Cake',
		basePrice: '570000',
		primaryImageUrl: 'https://example.com/rosalie.jpg'
	};

	const adapted = adaptProduct(backendProduct);

	assert.equal(adapted.id, 'prod-789');
	assert.equal(adapted.image_url, 'https://example.com/rosalie.jpg');
	assert.equal(adapted.imageUrl, 'https://example.com/rosalie.jpg');
	assert.equal(adapted.product_images.length, 1);
	assert.equal(adapted.product_images[0].image_url, 'https://example.com/rosalie.jpg');
});

test('adaptProducts maps arrays correctly', () => {
	const list = [
		{ id: '1', name: 'Cake 1', basePrice: 100000, images: [{ imageUrl: '/c1.jpg', isPrimary: true }] },
		{ id: '2', name: 'Cake 2', basePrice: 200000, images: [{ imageUrl: '/c2.jpg', isPrimary: true }] }
	];

	const adapted = adaptProducts(list);
	assert.equal(adapted.length, 2);
	assert.equal(adapted[0].base_price, 100000);
	assert.equal(adapted[0].image_url, '/c1.jpg');
	assert.equal(adapted[1].base_price, 200000);
	assert.equal(adapted[1].image_url, '/c2.jpg');
	assert.equal(Object.hasOwn(adapted[0], 'product_addons'), false);
	assert.equal(Object.hasOwn(adapted[0], 'addons'), false);
});

test('adaptProduct preserves an explicitly empty addon relation', () => {
	const adapted = adaptProduct({ id: 'prod-1', name: 'Plain Cake', addons: [] });

	assert.deepEqual(adapted.product_addons, []);
	assert.deepEqual(adapted.addons, []);
});

test('adaptAddon correctly normalizes active state and pricing', () => {
	const addon = {
		id: 'addon-1',
		name: 'Gift Card',
		category: 'Cards',
		price: 10000,
		isActive: true
	};

	const adapted = adaptAddon(addon);
	assert.equal(adapted.id, 'addon-1');
	assert.equal(adapted.is_active, true);
	assert.equal(adapted.price, 10000);
});

test('adaptOrderForm preserves nested product and image details', () => {
	const form = {
		id: 'form-1',
		title: 'Order Form Special',
		slug: 'order-form-special',
		isActive: true,
		product: {
			id: 'prod-1',
			name: 'Special Cake',
			basePrice: 250000,
			images: [{ imageUrl: '/special.jpg', isPrimary: true }]
		}
	};

	const adapted = adaptOrderForm(form);
	assert.equal(adapted.id, 'form-1');
	assert.equal(adapted.is_active, true);
	assert.equal(adapted.products?.name, 'Special Cake');
	assert.equal(adapted.products?.image_url, '/special.jpg');
});

test('adaptProducts handles catalog items with categoryId, categoryName, and primaryImageUrl', () => {
	const catalogItems = [
		{
			id: 'prod-cat-1',
			name: 'Bento Minimalist',
			basePrice: '150000',
			isAvailable: true,
			categoryId: 'c1a0c442-98fc-1c14-9afb-4c7b415a1111',
			categoryName: 'Bento Cakes',
			categorySlug: 'bento-cakes',
			primaryImageUrl: 'https://storage/bento.jpg'
		}
	];

	const adapted = adaptProducts(catalogItems);
	assert.equal(adapted.length, 1);
	assert.equal(adapted[0].id, 'prod-cat-1');
	assert.equal(adapted[0].name, 'Bento Minimalist');
	assert.equal(adapted[0].base_price, '150000');
	assert.equal(adapted[0].category_id, 'c1a0c442-98fc-1c14-9afb-4c7b415a1111');
	assert.equal(adapted[0].categoryId, 'c1a0c442-98fc-1c14-9afb-4c7b415a1111');
	assert.equal(adapted[0].category?.name, 'Bento Cakes');
	assert.equal(adapted[0].categories?.name, 'Bento Cakes');
	assert.equal(adapted[0].image_url, 'https://storage/bento.jpg');
});

test('adaptOrder correctly maps flat order list item from GET /admin/orders', () => {
	const rawOrder = {
		id: '4bdf7a3d-7c7d-4a69-a624-d5a5566fdc20',
		orderNumber: 64,
		customerName: 'azki',
		phoneNumber: '6285155119213',
		address: 'Pickup',
		email: 'azkiajmal@gmail.com',
		productId: 'dbe37e4e-ffd8-45d1-9a76-8bf24ba7efcb',
		productName: 'test product order singkat saja',
		cakeSize: '10cm',
		quantity: 1,
		cakeFlavor: 'Standard',
		cakeColor: null,
		addEdibleGlitter: '',
		deliveryDate: '2026-09-30',
		deliveryTime: '12:30:00',
		cakeText: null,
		giftCardText: null,
		referenceImageUrl: null,
		status: 'Pending',
		createdAt: '2026-09-26T05:51:34.528Z',
		proofOfTransfer: null,
		amount: null,
		crownOption: null,
		cakePrice: '0',
		deliveryFee: '0',
		deliveryVehicle: null,
		estimatedSubtotal: '320000',
		sizePrice: null,
		darkColorSurcharge: '0',
		cakeTopperFee: '0',
		estimatedUnitPrice: null,
		hasCakeTopper: false,
		deliveryOption: 'pickup',
		customizedOptions: null,
		productVariantId: '34cf35b0-6919-4975-818a-4f1df85e5332'
	};

	const adapted = adaptOrder(rawOrder);

	assert.equal(adapted.id, '4bdf7a3d-7c7d-4a69-a624-d5a5566fdc20');
	assert.equal(adapted.order_number, 64);
	assert.equal(adapted.customer_name, 'azki');
	assert.equal(adapted.delivery_option, 'pickup');
	assert.equal(adapted.amount, 320000);
	assert.equal(adapted.order_items.length, 1);
	assert.equal(adapted.order_items[0].product_name, 'test product order singkat saja');
	assert.equal(adapted.order_items[0].cake_size, '10cm');
	assert.equal(adapted.products?.name, 'test product order singkat saja');
});

test('adaptOrder correctly maps nested items with addons from GET /admin/orders/:id', () => {
	const rawDetailOrder = {
		id: '4bdf7a3d-7c7d-4a69-a624-d5a5566fdc20',
		orderNumber: 64,
		customerName: 'azki',
		phoneNumber: '6285155119213',
		address: 'Pickup',
		email: 'azkiajmal@gmail.com',
		status: 'Pending',
		createdAt: '2026-09-26T05:51:34.528Z',
		estimatedSubtotal: '320000',
		deliveryOption: 'pickup',
		items: [
			{
				id: '7fc51c99-ecf3-41ed-8d7f-a21090e2ba89',
				orderId: '4bdf7a3d-7c7d-4a69-a624-d5a5566fdc20',
				productId: 'dbe37e4e-ffd8-45d1-9a76-8bf24ba7efcb',
				productName: 'test product order singkat saja',
				productVariantId: '34cf35b0-6919-4975-818a-4f1df85e5332',
				variantName: '10cm',
				quantity: 1,
				cakeSize: '10cm',
				cakeFlavor: 'Standard',
				cakeColor: 'Deep Purple',
				crownOption: null,
				addEdibleGlitter: null,
				cakeText: null,
				giftCardText: null,
				referenceImageUrl: null,
				estimatedUnitPrice: '320000',
				estimatedSubtotal: '320000',
				hasCakeTopper: false,
				customizedOptions: {
					size: { name: '10cm', price: 100000 },
					color: { name: 'Deep Purple', price: 100000 },
					addons: [
						{ name: 'Love', price: 100000, category: 'Bentuk' },
						{ name: 'Rose', price: 20000, category: 'Bunga' }
					],
					cake_text: 'Happy Birthday!',
					gift_card_text: 'Best wishes always'
				}
			}
		]
	};

	const adapted = adaptOrder(rawDetailOrder);

	assert.equal(adapted.order_number, 64);
	assert.equal(adapted.order_items.length, 1);
	const item = adapted.order_items[0];
	assert.equal(item.product_name, 'test product order singkat saja');
	assert.equal(item.cake_color, 'Deep Purple');
	assert.equal(item.cake_text, 'Happy Birthday!');
	assert.equal(item.gift_card_text, 'Best wishes always');
	assert.equal(item.customized_options.addons.length, 2);
	assert.equal(item.customized_options.addons[0].name, 'Love');
});


