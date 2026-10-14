import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileModule } from 'svelte/compiler';

const dataModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const dependencies = {
	'svelte/internal/client': import.meta.resolve('svelte/internal/client'),
	'$app/navigation': dataModule('export const goto = () => { throw new Error("Unexpected navigation"); };'),
	'svelte-sonner': dataModule('export const toast = { info() {}, error() {} };'),
	'$lib/api/auth.js': dataModule('export const getAdminToken = () => "restored-token";'),
	'$lib/admin-session.js': dataModule(`
		export const ensureAdminSession = () => globalThis.notificationSessionHarness.ready;
		export function onAdminSessionInvalidated(callback) {
			const listeners = globalThis.notificationSessionHarness.listeners;
			listeners.add(callback); return () => listeners.delete(callback);
		}
	`),
	'$lib/api/notifications.js': dataModule(`
		export async function getAdminUnreadCount() {
			const h = globalThis.notificationSessionHarness;
			await h.ready; h.countCalls++; if (h.forbidden) throw { status: 403 };
			return { count: 4 };
		}
		export async function openAdminNotificationStream(token, signal) {
			const h = globalThis.notificationSessionHarness;
			h.streamCalls++; h.signal = signal;
			return { body: {} };
		}
	`),
	'$lib/admin-notifications.js': dataModule(`
		export const TOAST_BURST_MS = 5000, NOTIFICATIONS_URL = '/admin/dashboard/notifications';
		export const claimNotificationSound = () => false, getLastSoundStorage = () => null, isNewNotification = () => false;
		export function readSseStream() {
			return new Promise((resolve) => globalThis.notificationSessionHarness.signal.addEventListener('abort', resolve, { once: true }));
		}
	`)
};
const source = await readFile(new URL('../src/lib/admin-notification-center.svelte.js', import.meta.url), 'utf8');
const compiled = compileModule(source, { filename: 'admin-notification-center.svelte.js', generate: 'client' }).js.code;
const executable = compiled.replace(/from '([^']+)'/g, (_, path) => {
	assert.ok(dependencies[path], `Unmapped dependency: ${path}`);
	return `from '${dependencies[path]}'`;
});
const { createAdminNotificationCenter } = await import(dataModule(executable));
const settle = () => new Promise((resolve) => setImmediate(resolve));

function setup(t) {
	const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
	const originalDocument = globalThis.document;
	Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
	globalThis.document = { addEventListener() {}, removeEventListener() {} };
	let resolveSession;
	const h = { ready: new Promise((resolve) => { resolveSession = resolve; }), listeners: new Set(), streamCalls: 0, countCalls: 0, resolveSession };
	globalThis.notificationSessionHarness = h;
	const center = createAdminNotificationCenter();
	t.after(() => {
		center.stop(); delete globalThis.notificationSessionHarness;
		if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
		if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument;
	});
	return { h, center };
}

test('notification stream waits for session and cannot start after layout destruction', async (t) => {
	const { h, center } = setup(t);
	center.start(); await settle();
	assert.equal(h.streamCalls, 0); assert.equal(h.countCalls, 0);
	center.stop(); h.resolveSession('restored-token'); await settle();
	assert.equal(h.streamCalls, 0); assert.equal(center.state.unreadCount, 0);
});

test('session invalidation aborts the active notification stream and stops new requests', async (t) => {
	const { h, center } = setup(t);
	center.start(); h.resolveSession('restored-token'); await settle();
	assert.equal(h.streamCalls, 1); assert.equal(center.state.unreadCount, 4);
	for (const callback of h.listeners) callback(); await settle();
	assert.equal(h.signal.aborted, true); assert.equal(center.state.available, false);
	await center.refreshCount(); assert.equal(h.countCalls, 1);
});

test('notification permission denial disables the feature without navigation', async (t) => {
	const { h, center } = setup(t);
	h.forbidden = true;
	center.start(); h.resolveSession('restored-token'); await settle();
	assert.equal(center.state.available, false);
	assert.equal(h.listeners.size, 1); // Session stays intact; no invalidation or logout.
});
