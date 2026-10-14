import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canManageExpenseWhatsApp, normalizeExpenseSender } from '../src/lib/expense-whatsapp.js';
import { visibleAdminMenus, groupAdminNavItems } from '../src/lib/admin-menu.js';

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const key = `expenseWhatsAppTest_${Date.now()}`;
const state = { calls: [], result: null, error: null, authErrors: [] };
globalThis[key] = state;
const api = moduleUrl(`
const state = globalThis[${JSON.stringify(key)}];
export async function getExpenseWhatsAppConfig(...args) { state.calls.push(['get', ...args]); if (state.error) throw state.error; return state.result; }
export async function updateExpenseWhatsAppConfig(...args) { state.calls.push(['put', ...args]); if (state.error) throw state.error; return state.result; }
`);
const dependencies = {
	'@sveltejs/kit': moduleUrl(`export const fail = (status, data) => ({ status, data }); export const error = (status, message) => { throw { status, message }; }; export const redirect = (status, location) => { throw { status, location }; };`),
	'$lib/api/expense-whatsapp.js': api,
	'$lib/api/auth.js': moduleUrl(`export function handleAdminAuthError(err) { globalThis[${JSON.stringify(key)}].authErrors.push(err); if (err.status === 401) throw { status: 303, location: '/admin/login' }; }`),
	'$lib/expense-whatsapp.js': new URL('../src/lib/expense-whatsapp.js', import.meta.url).href,
};
const source = await readFile(new URL('../src/routes/admin/dashboard/expense-whatsapp/+page.server.js', import.meta.url), 'utf8');
const { load, actions } = await import(moduleUrl(source.replace(/from '([^']+)'/g, (_, path) => {
	assert.ok(dependencies[path], `Unmapped dependency: ${path}`);
	return `from '${dependencies[path]}'`;
})));
function event(values = {}, admin = { role: 'admin', permissions: ['expense.manage'] }) {
	state.calls = []; state.result = null; state.error = null; state.authErrors = [];
	const form = new FormData();
	for (const [key, value] of Object.entries(values)) form.set(key, value);
	const headers = {};
	return {
		locals: { adminToken: 'session-token', adminUser: admin }, cookies: {}, fetch: () => {},
		request: new Request('http://localhost/admin/dashboard/expense-whatsapp', { method: 'POST', body: form }),
		headers, setHeaders: (values) => Object.assign(headers, values),
	};
}

test('expense sender normalizes local and international numbers and rejects malformed input', () => {
	for (const number of ['0812-3456-7890', '+62 812 3456 7890', '6281234567890', '81234567890']) assert.equal(normalizeExpenseSender(number), '6281234567890');
	assert.equal(normalizeExpenseSender('+1 (555) 123-4567'), '15551234567');
	for (const number of ['', 'abc', '62812@g.us', '123', '1'.repeat(17)]) assert.throws(() => normalizeExpenseSender(number));
});

test('expense menu appears once for authorized accounts and belongs to Settings', () => {
	for (const admin of [{ role: 'super_admin' }, { permissions: ['*'] }, { role: 'admin', permissions: ['expense.manage'], menus: [{ name: 'Orders', url: '/admin/orders' }] }]) {
		assert.equal(canManageExpenseWhatsApp(admin), true);
		const menus = visibleAdminMenus(admin);
		assert.equal(menus.filter((menu) => menu.url === '/admin/dashboard/expense-whatsapp').length, 1);
		const grouped = groupAdminNavItems(menus.map((menu) => ({ href: menu.url })));
		assert.ok(grouped.groups.find((group) => group.id === 'settings').items.some((item) => item.href === '/admin/dashboard/expense-whatsapp'));
	}
	assert.equal(canManageExpenseWhatsApp({ permissions: ['order.read'] }), false);
	assert.ok(!visibleAdminMenus({ role: 'admin', permissions: ['order.read'], menus: [{ name: 'Expense WA', url: '/admin/expense-whatsapp' }] }).some((menu) => menu.url === '/admin/dashboard/expense-whatsapp'));
});

test('load handles unconfigured and saved state and disables caching', async () => {
	const input = event();
	assert.deepEqual(await load(input), { config: null, loadError: null });
	assert.equal(input.headers['cache-control'], 'private, no-store');
	state.result = { senderNumber: '6281234567890', enabled: true };
	assert.deepEqual((await load(input)).config, state.result);
	assert.deepEqual(state.calls[0], ['get', input.locals.adminToken, input.fetch]);
});

test('load and save reject missing sessions or expense permission before API access', async () => {
	for (const handler of [load, actions.save]) {
		const input = event({}, { permissions: ['order.read'] });
		await assert.rejects(handler(input), (err) => err.status === 403);
		assert.equal(state.calls.length, 0);
		input.locals.adminToken = null;
		await assert.rejects(handler(input), (err) => err.status === 303);
	}
});

test('load exposes backend failure instead of treating it as unconfigured', async () => {
	const input = event(); state.error = { status: 503, message: 'Backend offline' };
	assert.deepEqual(await load(input), { config: null, loadError: 'Backend offline' });
	state.error = { status: 401, message: 'Expired' };
	await assert.rejects(load(input), (err) => err.status === 303);
});

test('save validates before mutation and preserves form input on failure', async () => {
	for (const senderNumber of ['', 'abc', '123']) {
		const input = event({ senderNumber, enabled: 'on' });
		const result = await actions.save(input);
		assert.equal(result.status, 422);
		assert.deepEqual(result.data.values, { senderNumber, enabled: true });
		assert.equal(state.calls.length, 0);
	}
});

test('save supports enabling, changing sender, and disabling with returned canonical state', async () => {
	for (const enabled of [true, false]) {
		const input = event({ senderNumber: '0812-3456-7890', ...(enabled ? { enabled: 'on' } : {}) });
		state.result = { senderNumber: '6281234567890', enabled };
		const result = await actions.save(input);
		assert.equal(result.success, true);
		assert.deepEqual(result.config, state.result);
		assert.deepEqual(state.calls[0], ['put', state.result, 'session-token', input.fetch]);
	}
});

test('backend save failures preserve values and never report success', async () => {
	const input = event({ senderNumber: '081234567890', enabled: 'on' });
	state.error = { status: 422, message: 'Nomor tidak valid' };
	const result = await actions.save(input);
	assert.equal(result.status, 422);
	assert.equal(result.data.error, 'Nomor tidak valid');
	assert.deepEqual(result.data.values, { senderNumber: '081234567890', enabled: true });
	const malformed = event({ senderNumber: '081234567890', enabled: 'on' }); state.result = {};
	assert.equal((await actions.save(malformed)).status, 502);
});

test('API uses authenticated GET and PUT on the expense config endpoint', async () => {
	const source = await readFile(new URL('../src/lib/api/expense-whatsapp.js', import.meta.url), 'utf8');
	const client = moduleUrl(`export async function apiFetch(...args) { globalThis[${JSON.stringify(key)}].calls.push(args); return { data: globalThis[${JSON.stringify(key)}].result }; } export const unwrapData = (response) => response.data;`);
	const wrappers = await import(moduleUrl(source.replace("'./client.js'", `'${client}'`)));
	state.calls = []; state.result = { senderNumber: '6281234567890', enabled: true };
	assert.deepEqual(await wrappers.getExpenseWhatsAppConfig('token', 'fetch'), state.result);
	await wrappers.updateExpenseWhatsAppConfig(state.result, 'token', 'fetch');
	assert.deepEqual(state.calls, [
		['/admin/expense-whatsapp/config', { method: 'GET', token: 'token' }, 'fetch'],
		['/admin/expense-whatsapp/config', { method: 'PUT', token: 'token', body: state.result }, 'fetch'],
	]);
});
