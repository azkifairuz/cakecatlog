import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getImageUrl } from '../src/lib/image-url.js';

test('MinIO URLs preserve original path and query even when resize options are requested', () => {
  const url = 'https://storage.dessertbyfir.com/products/kue%20cokelat.png?X-Amz-Signature=example';
  assert.equal(getImageUrl(url, { width: 400, quality: 80 }), url);
});

test('Supabase public images still use its render endpoint', () => {
  const result = new URL(getImageUrl('https://project.supabase.co/storage/v1/object/public/products/cake.jpg', { width: 400 }));
  assert.equal(result.pathname, '/storage/v1/render/image/public/products/cake.jpg');
  assert.equal(result.searchParams.get('width'), '400');
});

test('invalid, empty and object-form image URLs retain supported behavior', () => {
  assert.equal(getImageUrl(null), '');
  assert.equal(getImageUrl('/local/cake.png', { width: 400 }), '/local/cake.png');
  assert.equal(getImageUrl({ image_url: 'https://storage.dessertbyfir.com/products/cake.jpg' }, { width: 400 }), 'https://storage.dessertbyfir.com/products/cake.jpg');
});
