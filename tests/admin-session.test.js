import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createAdminSession } from '../src/lib/admin-session.js';
import { POST, DELETE } from '../src/routes/admin/session/+server.js';

function fixture(fetchSession, blocked = false) {
	const storage = new Map();
	const redirects = [];
	const browser = {
		location: { pathname: '/admin/dashboard/orders', replace: (url) => redirects.push(url) },
		get localStorage() {
			if (blocked) throw new Error('Storage denied');
			return { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
		}
	};
	return { session: createAdminSession({ getBrowser: () => browser, fetchSession }), storage, redirects, browser };
}

const success = () => Response.json({ token: 'cookie-token' });

test('cookie-only PWA restores one shared session before concurrent requests', async () => {
	let calls = 0;
	const { session, storage } = fixture(async (url, options) => {
		calls++;
		assert.equal(url, '/admin/session');
		assert.equal(options.method, 'POST');
		assert.equal(options.credentials, 'same-origin');
		assert.equal(options.cache, 'no-store');
		return success();
	});
	assert.deepEqual(await Promise.all([session.ensure(), session.ensure(), session.ensure()]), Array(3).fill('cookie-token'));
	assert.equal(await session.ensure(), 'cookie-token');
	assert.equal(calls, 1);
	assert.equal(storage.get('admin_access_token'), 'cookie-token');
});

test('blocked localStorage still supports session recovery, login and clear in memory', async () => {
	const { session } = fixture(async () => success(), true);
	assert.equal(session.getToken(), null);
	assert.equal(await session.ensure(), 'cookie-token');
	assert.equal(session.getToken(), 'cookie-token');
	session.setToken('login-token');
	assert.equal(await session.ensure(), 'login-token');
	session.setToken(null);
	assert.equal(session.getToken(), null);
});

test('cookie token replaces stale localStorage rather than trusting it on startup', async () => {
	const { session, storage } = fixture(async () => success());
	storage.set('admin_access_token', 'stale');
	assert.equal(await session.ensure(), 'cookie-token');
	assert.equal(session.getToken(), 'cookie-token');
});

test('concurrent 401 handling deletes cookie and redirects only once', async () => {
	let deletes = 0;
	const { session, redirects } = fixture(async (_, options) => {
		assert.equal(options.method, 'DELETE');
		deletes++;
		return Response.json({ success: true });
	});
	session.setToken('expired');
	let stopped = 0;
	session.onInvalidated(() => { stopped++; });
	await Promise.all([session.invalidate(), session.invalidate()]);
	assert.equal(deletes, 1);
	assert.equal(stopped, 1);
	assert.equal(session.getToken(), null);
	assert.deepEqual(redirects, ['/admin/login']);
	await assert.rejects(session.ensure(), { status: 401 });
	assert.equal(deletes, 1);
});

test('invalid cookie recovery deletes the cookie before login navigation', async () => {
	const methods = [];
	const { session, redirects } = fixture(async (_, { method }) => {
		methods.push(method);
		return Response.json({}, { status: method === 'POST' ? 401 : 200 });
	});
	await assert.rejects(session.ensure(), { status: 401 });
	assert.deepEqual(methods, ['POST', 'DELETE']);
	assert.deepEqual(redirects, ['/admin/login']);
});

test('failed cookie deletion stops session use without redirecting into a loop', async () => {
	const { session, redirects } = fixture(async () => { throw new Error('Offline'); });
	session.setToken('expired');
	await assert.rejects(session.invalidate(), { status: 503 });
	await assert.rejects(session.ensure(), { status: 503 });
	assert.deepEqual(redirects, []);
	assert.equal(session.getToken(), null);
});

test('temporary bootstrap failure preserves storage and permits a later retry', async () => {
	let attempts = 0;
	const { session, storage, redirects } = fixture(async () => {
		if (++attempts === 1) throw new Error('Offline');
		return success();
	});
	storage.set('admin_access_token', 'old-token');
	await assert.rejects(session.ensure(), { status: 503 });
	assert.equal(storage.get('admin_access_token'), 'old-token');
	assert.deepEqual(redirects, []);
	assert.equal(await session.ensure(), 'cookie-token');
});

test('logout during recovery cannot resurrect the token', async () => {
	let finish;
	const { session } = fixture(() => new Promise((resolve) => { finish = resolve; }));
	const pending = session.ensure();
	await Promise.resolve();
	session.setToken(null);
	finish(success());
	await assert.rejects(pending, { status: 503 });
	assert.equal(session.getToken(), null);
});

test('session endpoint returns non-cacheable JSON for valid, invalid and temporarily unvalidated cookies', async () => {
	for (const [locals, status] of [
		[{ adminToken: 'cookie-token', adminUser: { id: 'admin' } }, 200],
		[{ adminToken: null, adminUser: null }, 401],
		[{ adminToken: 'cookie-token', adminUser: null }, 503]
	]) {
		const response = POST({ locals });
		assert.equal(response.status, status);
		assert.match(response.headers.get('cache-control'), /no-store/);
		assert.equal(response.headers.has('location'), false);
		const payload = await response.json();
		assert.equal(payload.token, status === 200 ? 'cookie-token' : undefined);
	}
	let deleted;
	const response = DELETE({ cookies: { delete: (...args) => { deleted = args; } } });
	assert.deepEqual(deleted, ['admin_access_token', { path: '/' }]);
	assert.equal(response.status, 200);
	assert.match(response.headers.get('cache-control'), /no-store/);
});

// Execute the real API client with only its build-time environment import substituted.
const source = await readFile(new URL('../src/lib/api/client.js', import.meta.url), 'utf8');
const executable = source
	.replace("import { PUBLIC_API_BASE_URL } from '$env/static/public';", "const PUBLIC_API_BASE_URL = 'https://backend.test/api';")
	.replace("'../admin-session.js'", JSON.stringify(new URL('../src/lib/admin-session.js', import.meta.url).href));
const { apiFetch } = await import(`data:text/javascript;base64,${Buffer.from(executable).toString('base64')}`);
const { clearAdminToken } = await import('../src/lib/admin-session.js');

test('real API client restores auth for admin calls; public calls bypass recovery; later requests stay blocked after 401', async (t) => {
	const originalFetch = globalThis.fetch;
	const originalWindow = globalThis.window;
	const calls = [];
	const redirects = [];
	globalThis.window = { location: { pathname: '/admin/dashboard', replace: (url) => redirects.push(url) }, get localStorage() { throw new Error('Denied'); } };
	globalThis.fetch = async (url, options) => {
		calls.push(options.method);
		return options.method === 'POST' ? success() : Response.json({ success: true });
	};
	t.after(() => { clearAdminToken(); globalThis.fetch = originalFetch; if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
	clearAdminToken();
	await apiFetch('/products', {}, async (_, options) => {
		assert.equal(options.headers.has('Authorization'), false);
		return Response.json({ data: [] });
	});
	assert.deepEqual(calls, []);
	await apiFetch('/admin/notifications/unread-count', {}, async (_, options) => {
		assert.equal(options.headers.get('Authorization'), 'Bearer cookie-token');
		return Response.json({ data: { count: 2 } });
	});
	assert.deepEqual(calls, ['POST']);
	await assert.rejects(apiFetch('/admin/notifications', {}, async () => Response.json({ message: 'Expired' }, { status: 401 })), { status: 401 });
	await assert.rejects(apiFetch('/admin/notifications', {}, async () => new Response('Expired', { status: 401 })), { status: 401 });
	assert.deepEqual(calls, ['POST', 'DELETE']);
	assert.deepEqual(redirects, ['/admin/login']);
});

test('non-JSON 401 follows the same invalidation path and 403 keeps the session', async (t) => {
	const originalFetch = globalThis.fetch;
	const originalWindow = globalThis.window;
	const methods = [];
	const redirects = [];
	globalThis.window = { location: { pathname: '/admin/dashboard', replace: (url) => redirects.push(url) } };
	globalThis.fetch = async (_, { method }) => { methods.push(method); return method === 'POST' ? success() : Response.json({ success: true }); };
	t.after(() => { clearAdminToken(); globalThis.fetch = originalFetch; if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; });
	clearAdminToken();
	await assert.rejects(apiFetch('/admin/notifications', {}, async () => new Response('Forbidden', { status: 403 })), { status: 403 });
	assert.deepEqual(methods, ['POST']);
	assert.deepEqual(redirects, []);
	await assert.rejects(apiFetch('/admin/notifications', {}, async () => new Response('Expired', { status: 401 })), { status: 401 });
	assert.deepEqual(methods, ['POST', 'DELETE']);
	assert.deepEqual(redirects, ['/admin/login']);
});

const dataModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const hookSource = await readFile(new URL('../src/hooks.server.js', import.meta.url), 'utf8');
const authStub = dataModule(`
export { isAuthError } from ${JSON.stringify(new URL('../src/lib/auth-errors.js', import.meta.url).href)};
export async function getAdminMe(token, fetch) { return fetch(token); }
`);
const { handle } = await import(dataModule(hookSource
	.replace("'@sveltejs/kit'", JSON.stringify(import.meta.resolve('@sveltejs/kit')))
	.replace("'$lib/api/auth.js'", JSON.stringify(authStub))));

test('hook lets session endpoint return JSON for missing cookies and skips validation on DELETE', async () => {
	for (const method of ['POST', 'DELETE']) {
		let deleted = false;
		const event = {
			url: new URL('https://app.test/admin/session'), request: new Request('https://app.test/admin/session', { method }), locals: {},
			cookies: { get: () => method === 'DELETE' ? 'expired' : null, delete: () => { deleted = true; } },
			fetch: () => { throw new Error('DELETE must not call backend'); }
		};
		const response = await handle({ event, resolve: (event) => method === 'POST' ? POST(event) : DELETE(event) });
		assert.equal(response.status, method === 'POST' ? 401 : 200);
		assert.equal(response.headers.has('location'), false);
		assert.equal(deleted, method === 'DELETE');
	}
});

test('hook validates cookie before releasing token; backend outage returns 503 without deleting cookie', async (t) => {
	t.mock.method(console, 'error', () => {});
	for (const unavailable of [false, true]) {
		let deleted = false;
		const event = {
			url: new URL('https://app.test/admin/session'), request: new Request('https://app.test/admin/session', { method: 'POST' }), locals: {},
			cookies: { get: () => 'cookie-token', delete: () => { deleted = true; } },
			fetch: async (token) => { assert.equal(token, 'cookie-token'); if (unavailable) throw Object.assign(new Error('Offline'), { status: 503 }); return { id: 'admin' }; }
		};
		const response = await handle({ event, resolve: POST });
		assert.equal(response.status, unavailable ? 503 : 200);
		assert.equal(deleted, false);
		assert.equal((await response.json()).token, unavailable ? undefined : 'cookie-token');
	}
});
