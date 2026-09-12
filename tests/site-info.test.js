import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SITE_INFO, getWhatsAppHref } from '../src/lib/site-info.js';

test('uses the shop WhatsApp number as the default', () => {
	assert.equal(DEFAULT_SITE_INFO.whatsapp_number, '6285883749714');
});

test('creates an international WhatsApp link from an Indonesian local number', () => {
	assert.equal(getWhatsAppHref('0858 8374-9714'), 'https://wa.me/6285883749714');
});

test('keeps an Indonesian international number unchanged in the WhatsApp link', () => {
	assert.equal(getWhatsAppHref('+62 858 8374 9714'), 'https://wa.me/6285883749714');
});

test('does not create a WhatsApp link from an empty value', () => {
	assert.equal(getWhatsAppHref(''), null);
});
