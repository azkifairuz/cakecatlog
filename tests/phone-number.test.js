import assert from 'node:assert/strict';
import test from 'node:test';
import {
	detectPhoneCountry,
	normalizePhoneNumber,
	PhoneNumberError,
	toWhatsAppDigits
} from '../src/lib/phone-number.js';

test('normalizes Indonesian and Malaysian numbers to E.164', () => {
	assert.equal(normalizePhoneNumber('0812-3456-7890'), '+6281234567890');
	assert.equal(normalizePhoneNumber('812-3456-7890', { country: 'ID' }), '+6281234567890');
	assert.equal(normalizePhoneNumber('012-819 0553', { country: 'MY' }), '+60128190553');
	assert.equal(normalizePhoneNumber('+60 12-819 0553'), '+60128190553');
	assert.equal(normalizePhoneNumber('60128190553'), '+60128190553');
	assert.equal(toWhatsAppDigits('+60128190553'), '60128190553');
});

test('detects the country from a pasted international number', () => {
	assert.equal(detectPhoneCountry('+60 12-819 0553'), 'MY');
	assert.equal(detectPhoneCountry('0128190553'), null);
});

test('rejects malformed and impossible phone numbers', () => {
	for (const value of ['customer@example.com', '1234', '+999123456789', '++60128190553']) {
		assert.throws(() => normalizePhoneNumber(value), PhoneNumberError);
	}
});
