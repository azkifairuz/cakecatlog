import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { visibleAdminMenus, groupAdminNavItems } from '../src/lib/admin-menu.js';

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const state = { calls: [], error: null, authErrors: [] };
const name = `apiKeyTest_${Date.now()}`;
globalThis[name] = state;
const api = moduleUrl(`
	const state = globalThis[${JSON.stringify(name)}];
	export async function generateAdminApiKey(...args) {
		state.calls.push(['generate', ...args]);
		if (state.error) throw state.error;
		return { apiKey: 'dbf_test-secret', expiresAt: '2026-11-12T00:00:00.000Z' };
	}
	export async function deleteAdminApiKey(...args) {
		state.calls.push(['remove', ...args]);
		if (state.error) throw state.error;
		return { success: true };
	}
`);
const auth = moduleUrl(`export function handleAdminAuthError(err) { globalThis[${JSON.stringify(name)}].authErrors.push(err); }`);
const kit = moduleUrl(`
	export const fail = (status, data) => ({ status, data });
	export const error = (status, message) => { throw { status, message }; };
	export const redirect = (status, location) => { throw { status, location }; };
`);
const serverSource = await readFile(new URL('../src/routes/admin/dashboard/api-keys/+page.server.js', import.meta.url), 'utf8');
const dependencies = { '@sveltejs/kit': kit, '$lib/api/api-keys.js': api, '$lib/api/auth.js': auth };
const { load, actions } = await import(moduleUrl(serverSource.replace(/from '([^']+)'/g, (_, path) => {
	assert.ok(dependencies[path], `Unmapped dependency: ${path}`);
	return `from '${dependencies[path]}'`;
})));
function event(values = {}, locals = { adminToken: 'session-token', adminUser: { username: 'Admin' } }) {
	state.calls = []; state.error = null; state.authErrors = [];
	const form = new FormData();
	for (const [key, value] of Object.entries(values)) form.set(key, value);
	const headers = {};
	return {
		request: new Request('http://localhost/admin/dashboard/api-keys', { method: 'POST', body: form }),
		locals, cookies: {}, fetch: () => {}, headers,
		setHeaders: (values) => Object.assign(headers, values)
	};
}

test('API key is visible once for regular admins with existing menu grants and belongs to Settings', () => {
	for (const admin of [
		{ role: 'admin', menus: [{ name: 'Orders', url: '/admin/orders' }] },
		{ role: 'admin', menus: [{ name: 'API key', url: '/admin/api-keys' }, { name: 'Duplicate', url: '/admin/dashboard/api-keys' }] },
		{ role: 'super_admin', menus: [] }
	]) {
		const menus = visibleAdminMenus(admin);
		assert.equal(menus.filter((menu) => menu.url === '/admin/dashboard/api-keys').length, 1);
		const groups = groupAdminNavItems(menus.map((menu) => ({ href: menu.url })));
		assert.ok(groups.groups.find((group) => group.id === 'settings').items.some((item) => item.href === '/admin/dashboard/api-keys'));
	}
});

test('load uses the current account and disables caching', () => {
	const input = event();
	assert.deepEqual(load(input), { username: 'Admin' });
	assert.equal(input.headers['cache-control'], 'private, no-store');
});

test('generation requires a session, a loaded account, and nonempty credentials before calling backend', async () => {
	await assert.rejects(actions.generate(event({ username: 'Admin', password: 'secret' }, {})), (err) => err.status === 303);
	await assert.rejects(actions.generate(event({ username: 'Admin', password: 'secret' }, { adminToken: 'session-token' })), (err) => err.status === 503);
	for (const values of [{}, { username: 'Admin' }, { username: 'Admin', password: '   ' }]) {
		const result = await actions.generate(event(values));
		assert.equal(result.status, 422);
		assert.equal(state.calls.length, 0);
	}
});

test('generation rejects another username and does not expose credentials in the response', async () => {
	const result = await actions.generate(event({ username: 'another-admin', password: 'secret' }));
	assert.equal(result.status, 403);
	assert.equal(state.calls.length, 0);
	assert.ok(!JSON.stringify(result).includes('secret'));
});

test('generation preserves password spaces and returns the one-time key with expiration', async () => {
	const input = event({ username: ' ADMIN ', password: ' secret password ' });
	const result = await actions.generate(input);
	assert.equal(result.success, true);
	assert.equal(result.apiKey, 'dbf_test-secret');
	assert.equal(result.expiresAt, '2026-11-12T00:00:00.000Z');
	assert.deepEqual(state.calls[0], ['generate', 'ADMIN', ' secret password ', input.fetch]);
	assert.ok(!JSON.stringify(result).includes('secret password'));
});

test('wrong generation password and rate limits do not invalidate the admin session', async () => {
	for (const status of [401, 429]) {
		const input = event({ username: 'Admin', password: 'wrong-password' });
		state.error = { status, message: status === 401 ? 'Username atau password salah' : 'Terlalu banyak percobaan' };
		const result = await actions.generate(input);
		assert.equal(result.status, status);
		assert.equal(state.authErrors.length, 0);
		assert.ok(!JSON.stringify(result).includes('wrong-password'));
	}
});

test('deletion requires confirmation and revokes with the current session token', async () => {
	assert.equal((await actions.remove(event())).status, 422);
	assert.equal(state.calls.length, 0);
	const input = event({ confirmDelete: 'on' });
	const result = await actions.remove(input);
	assert.equal(result.success, true);
	assert.equal(result.action, 'remove');
	assert.ok(!('apiKey' in result));
	assert.deepEqual(state.calls[0], ['remove', 'session-token', input.fetch]);
});

test('deletion session errors use the existing session expiry handler', async () => {
	const input = event({ confirmDelete: 'on' });
	state.error = { status: 401, message: 'Token kedaluwarsa' };
	await actions.remove(input);
	assert.equal(state.authErrors.length, 1);
});

test('API wrappers send username/password via POST and the session token via DELETE', async () => {
	const source = await readFile(new URL('../src/lib/api/api-keys.js', import.meta.url), 'utf8');
	const client = moduleUrl(`
		export async function apiFetch(path, options, customFetch) {
			globalThis[${JSON.stringify(name)}].calls.push([path, options, customFetch]);
			return { success: true, data: { apiKey: 'dbf_new', expiresAt: 'expires' } };
		}
		export const unwrapData = (response) => response.data;
	`);
	const { generateAdminApiKey, deleteAdminApiKey } = await import(moduleUrl(source.replace("'./client.js'", `'${client}'`)));
	state.calls = [];
	assert.equal((await generateAdminApiKey('Admin', ' password ', 'fetch')).apiKey, 'dbf_new');
	await deleteAdminApiKey('bearer', 'fetch');
	assert.deepEqual(state.calls, [
		['/auth/api-key', { method: 'POST', body: { username: 'Admin', password: ' password ' } }, 'fetch'],
		['/auth/api-key', { method: 'DELETE', token: 'bearer' }, 'fetch']
	]);
});
