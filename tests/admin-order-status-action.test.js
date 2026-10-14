import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const source = await readFile(new URL('../src/routes/admin/dashboard/orders/+page.server.js', import.meta.url), 'utf8');
const apiNames = source.match(/import\s*\{([^}]+)\}\s*from '\$lib\/api\/admin.js'/)[1].split(',').map((name) => name.trim());
const api = moduleUrl(apiNames.map((name) => name === 'updateAdminOrderStatus'
	? `export async function ${name}(id, status) { return { id, status, customerName: 'Tester', deliveryOption: 'pickup' }; }`
	: `export async function ${name}() {}`).join('\n'));
const dependencies = {
	'@sveltejs/kit': moduleUrl('export const fail = (status, data) => ({ status, data }); export const error = () => {};'),
	'$lib/api/admin.js': api,
	'$lib/api/adapters.js': new URL('../src/lib/api/adapters.js', import.meta.url).href,
	'$lib/server/admin-orders.js': new URL('../src/lib/server/admin-orders.js', import.meta.url).href,
	'$lib/api/auth.js': moduleUrl('export const handleAdminAuthError = () => {};'),
	'$lib/server/delivery-proof-action.js': moduleUrl('export const uploadDeliveryProofAction = () => {};')
};
// Keep the real import bindings so a missing adapter import fails this regression.
const executable = source.replace(/from '([^']+)'/g, (_, path) => {
	assert.ok(dependencies[path], `Unmapped dependency: ${path}`);
	return `from '${dependencies[path]}'`;
});
const { actions } = await import(moduleUrl(executable));

test('orders status action returns an adapted saved order without a ReferenceError', async () => {
	const form = new FormData();
	form.set('id', 'pickup-1');
	form.set('status', 'Completed');
	const result = await actions.updateStatus({
		request: new Request('http://localhost/admin/dashboard/orders', { method: 'POST', body: form }),
		locals: { adminToken: 'test-token' }, cookies: {}
	});
	assert.equal(result.success, true);
	assert.equal(result.order.id, 'pickup-1');
	assert.equal(result.order.status, 'Completed');
	assert.equal(result.order.customer_name, 'Tester');
	assert.equal(result.order.delivery_option, 'pickup');
});
