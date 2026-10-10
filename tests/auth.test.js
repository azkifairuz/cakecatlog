import assert from 'node:assert/strict';
import test from 'node:test';
import { isAuthError } from '../src/lib/auth-errors.js';

test('isAuthError correctly identifies status 401 and 403 errors', () => {
	assert.equal(isAuthError({ status: 401, message: 'Unauthorized' }), true);
	assert.equal(isAuthError({ status: 403, message: 'Forbidden' }), true);
	assert.equal(isAuthError({ status: 401 }), true);
	assert.equal(isAuthError({ status: 403 }), true);
});

test('isAuthError correctly identifies HTTP_401 and UNAUTHORIZED codes', () => {
	assert.equal(isAuthError({ code: 'HTTP_401' }), true);
	assert.equal(isAuthError({ code: 'HTTP_403' }), true);
	assert.equal(isAuthError({ code: 'UNAUTHORIZED' }), true);
});

test('isAuthError identifies token expired and invalid messages', () => {
	assert.equal(
		isAuthError({
			status: 401,
			code: 'HTTP_401',
			message: 'Token tidak valid atau sudah kedaluwarsa'
		}),
		true
	);
	assert.equal(isAuthError(new Error('Token tidak valid')), true);
	assert.equal(isAuthError(new Error('Token sudah kedaluwarsa')), true);
	assert.equal(isAuthError(new Error('jwt expired')), true);
	assert.equal(isAuthError(new Error('Invalid token provided')), true);
	assert.equal(isAuthError(new Error('unauthorized access')), true);
});

test('isAuthError returns false for non-auth errors', () => {
	assert.equal(isAuthError(null), false);
	assert.equal(isAuthError(undefined), false);
	assert.equal(isAuthError({ status: 404, message: 'Not found' }), false);
	assert.equal(isAuthError({ status: 400, message: 'Bad request' }), false);
	assert.equal(isAuthError({ status: 500, message: 'Internal Server Error' }), false);
	assert.equal(isAuthError(new Error('Gagal menghubungi backend API')), false);
});
