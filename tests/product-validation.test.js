import test from 'node:test';
import assert from 'node:assert/strict';
import {
	getProductFieldErrors,
	getProductPersistenceErrorMessage
} from '../src/lib/product-validation.js';

test('returns field errors for missing product name and base price', () => {
	assert.deepEqual(getProductFieldErrors({ name: '  ', basePrice: '' }), {
		name: 'Nama produk wajib diisi.',
		base_price: 'Harga dasar wajib diisi dan harus lebih dari Rp0.'
	});
});

test('accepts populated product fields', () => {
	assert.deepEqual(getProductFieldErrors({ name: 'Chocolate Cake', basePrice: '150000' }), {});
});

test('allows completely empty optional size rows', () => {
	assert.deepEqual(getProductFieldErrors({
		name: 'Chocolate Cake',
		basePrice: '150000',
		variants: [{ name: '', price: '' }]
	}), {});
});

test('requires both name and positive price when an optional size row is started', () => {
	assert.deepEqual(getProductFieldErrors({
		name: 'Chocolate Cake',
		basePrice: '150000',
		variants: [
			{ name: '10cm', price: '' },
			{ name: '', price: '200000' }
		]
	}), {
		variants: {
			0: { price: 'Harga size wajib diisi dan harus lebih dari Rp0.' },
			1: { name: 'Nama size wajib diisi jika harga size diisi.' }
		}
	});
});

test('rejects duplicate size names case-insensitively', () => {
	assert.deepEqual(getProductFieldErrors({
		name: 'Chocolate Cake',
		basePrice: '150000',
		variants: [
			{ name: '10cm', price: '150000' },
			{ name: '10CM', price: '200000' }
		]
	}), {
		variants: {
			1: { name: 'Nama size tidak boleh sama dalam satu produk.' }
		}
	});
});

test('never exposes database details in persistence messages', () => {
	const error = {
		code: '23502',
		message: 'null value in column "id" of relation "product_variants" violates not-null constraint'
	};
	const message = getProductPersistenceErrorMessage(error, 'variants');
	assert.equal(message, 'Ukuran dan harga produk belum berhasil disimpan. Periksa data size lalu coba lagi.');
	assert.equal(message.includes('product_variants'), false);
});
