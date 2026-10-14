import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { adaptOrder } from '../src/lib/api/adapters.js';
import { canonicalOrderStatus, DELIVERY_PROOF_FIELDS, hasDeliveryProof, needsDeliveryProof, orderStatusLabel, validateProofFile, saveDeliveryProof } from '../src/lib/order-delivery-proof.js';

const proof = { cakeInCarPhotoUrl: '/cake.jpg', driverPhotoUrl: '/driver.jpg', licensePlatePhotoUrl: '/plate.jpg' };
const files = () => Object.fromEntries(DELIVERY_PROOF_FIELDS.map(({ name }) => [name, new File(['image'], `${name}.jpg`, { type: 'image/jpeg' })]));

test('delivery requires three categories for both final statuses; pickup and other statuses are exempt', () => {
	for (const status of ['Delivered', 'Completed']) {
		assert.equal(needsDeliveryProof({ deliveryOption: 'delivery' }, status), true);
		assert.equal(needsDeliveryProof({ deliveryOption: 'delivery', ...proof }, status), false);
		assert.equal(needsDeliveryProof({ deliveryOption: 'pickup' }, status), false);
	}
	assert.equal(needsDeliveryProof({ deliveryOption: 'delivery' }, 'Processing'), false);
	assert.equal(hasDeliveryProof({ ...proof, licensePlatePhotoUrl: null }), false);
});

test('adapter preserves both photo URL shapes and canonicalizes legacy status labels', () => {
	const adapted = adaptOrder({ id: 'order-1', status: 'Selesai', cake_in_car_photo_url: '/cake.jpg', driver_photo_url: '/driver.jpg', license_plate_photo_url: '/plate.jpg' });
	assert.equal(adapted.status, 'Completed');
	assert.equal(adapted.cakeInCarPhotoUrl, '/cake.jpg');
	assert.equal(adapted.driver_photo_url, '/driver.jpg');
	assert.equal(hasDeliveryProof(adapted), true);
	assert.equal(canonicalOrderStatus('Diproses'), 'Processing');
	assert.equal(orderStatusLabel('Delivered'), 'Terkirim');
});

test('file validation rejects empty, invalid and oversized photos', () => {
	assert.equal(validateProofFile(files().cakeInCarPhoto), null);
	assert.ok(validateProofFile(new File([], 'empty.jpg', { type: 'image/jpeg' })));
	assert.ok(validateProofFile(new File(['text'], 'bad.txt', { type: 'text/plain' })));
	assert.ok(validateProofFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })));
});

// Load the actual SvelteKit action with test dependencies, without its virtual $lib imports.
const actionSource = (await readFile(new URL('../src/lib/server/delivery-proof-action.js', import.meta.url), 'utf8'))
	.replace(/^import .*;\n/gm, '').replace('export async function', 'async function');
function actionWith({ upload, update }) {
	return new Function('fail', 'adaptOrder', 'uploadAdminOrderDeliveryProof', 'updateAdminOrderStatus', 'handleAdminAuthError', 'DELIVERY_PROOF_FIELDS', 'validateProofFile', 'canonicalOrderStatus', `${actionSource}\nreturn uploadDeliveryProofAction;`)(
		(status, data) => ({ status, data }), adaptOrder, upload, update, () => {}, DELIVERY_PROOF_FIELDS, validateProofFile, canonicalOrderStatus
	);
}
function event({ retryStatus = false, status = 'Completed', includeFiles = true } = {}) {
	const formData = new FormData();
	formData.set('id', 'order-1');
	formData.set('status', status);
	formData.set('retryStatus', String(retryStatus));
	if (includeFiles) for (const [key, file] of Object.entries(files())) formData.set(key, file);
	return { request: { formData: async () => formData }, locals: { adminToken: 'test-token' }, fetch() {}, cookies: {} };
}

test('action uploads first, then changes status using the server token', async () => {
	const calls = [];
	const action = actionWith({
		upload: async (id, images, token) => { calls.push('upload'); assert.equal(token, 'test-token'); assert.equal(Object.keys(images).length, 3); return { id, status: 'Pending', ...proof }; },
		update: async (id, status) => { calls.push('status'); assert.equal(status, 'Completed'); return { id, status, ...proof }; }
	});
	const result = await action(event());
	assert.equal(result.success, true);
	assert.deepEqual(calls, ['upload', 'status']);
	assert.equal(result.order.status, 'Completed');
});

test('upload error leaves status untouched; incomplete form never calls API', async () => {
	let statusCalls = 0;
	let uploadCalls = 0;
	const action = actionWith({ upload: async () => { uploadCalls++; throw new Error('Upload failed'); }, update: async () => { statusCalls++; } });
	const result = await action(event());
	assert.equal(result.data.proofUploaded, false);
	assert.equal(statusCalls, 0);
	await action(event({ includeFiles: false }));
	assert.equal(uploadCalls, 1);
});

test('status failure retains saved proof and retry changes only the status', async () => {
	let uploads = 0;
	let statusAttempts = 0;
	const action = actionWith({
		upload: async (id) => { uploads++; return { id, status: 'Pending', ...proof }; },
		update: async (id, status) => { if (++statusAttempts === 1) throw new Error('Status failed'); return { id, status, ...proof }; }
	});
	const failed = await action(event());
	assert.equal(failed.data.proofUploaded, true);
	assert.equal(hasDeliveryProof(failed.data.order), true);
	const retry = await action(event({ retryStatus: true, includeFiles: false }));
	assert.equal(retry.success, true);
	assert.equal(uploads, 1);
	assert.equal(statusAttempts, 2);
});

test('proof replacement does not change status', async () => {
	let statusCalls = 0;
	const action = actionWith({ upload: async (id) => ({ id, status: 'Delivered', ...proof }), update: async () => { statusCalls++; } });
	const result = await action(event({ status: '' }));
	assert.equal(result.success, true);
	assert.equal(result.order.status, 'Delivered');
	assert.equal(statusCalls, 0);
});


test('browser sequence records saved proof on a status failure and retries without uploading', async () => {
	let uploads = 0;
	const upload = async () => { uploads++; return { id: 'order-1', ...proof }; };
	const update = async () => { throw new Error('Status failed'); };
	await assert.rejects(saveDeliveryProof({ id: 'order-1', status: 'Completed', files: files(), upload, update }), (error) => {
		assert.equal(error.proofUploaded, true);
		assert.ok(error.savedOrder.driverPhotoUrl);
		return true;
	});
	const result = await saveDeliveryProof({ id: 'order-1', status: 'Completed', retryStatus: true, upload, update: async () => ({ status: 'Completed', ...proof }) });
	assert.equal(result.order.status, 'Completed');
	assert.equal(uploads, 1);
});
