import assert from 'node:assert/strict';
import test from 'node:test';
import {
	createSseParser,
	readSseStream,
	isNewNotification,
	claimNotificationSound,
	urlBase64ToUint8Array,
	subscriptionPayload
} from '../src/lib/notification-utils.js';

test('SSE parser handles fragmented lines, heartbeats and multiline data', () => {
	const events = [];
	const parser = createSseParser((name, data) => events.push({ name, data }));
	parser.feed('event: connected\ndata: {"success":true}\n\nevent: notifi');
	parser.feed('cation\r\ndata: {"id":"n1",\r\ndata: "title":"Pesanan baru"}\r\n\r\n');
	parser.feed('event: heartbeat\ndata: {"now":"now"}\n\n');
	assert.deepEqual(events.map((event) => event.name), ['connected', 'notification', 'heartbeat']);
	assert.equal(JSON.parse(events[1].data).id, 'n1');
});

test('SSE stream reads split UTF-8 chunks', async () => {
	const bytes = new TextEncoder().encode('event: notification\ndata: {"title":"Kue 🍰"}\n\n');
	const stream = new ReadableStream({
		start(controller) {
			controller.enqueue(bytes.slice(0, bytes.length - 5));
			controller.enqueue(bytes.slice(bytes.length - 5));
			controller.close();
		}
	});
	const events = [];
	await readSseStream(stream, (name, data) => events.push({ name, data }));
	assert.equal(JSON.parse(events[0].data).title, 'Kue 🍰');
});

test('deduplicates notification IDs and limits sound to once a minute', () => {
	const seen = new Set();
	assert.equal(isNewNotification(seen, { id: 'n1' }), true);
	assert.equal(isNewNotification(seen, { id: 'n1' }), false);
	assert.equal(isNewNotification(seen, { id: 'n2' }), true);
	const values = new Map();
	const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
	assert.equal(claimNotificationSound(storage, 100_000), true);
	assert.equal(claimNotificationSound(storage, 159_999), false);
	assert.equal(claimNotificationSound(storage, 160_000), true);
});

test('converts VAPID key and serializes subscription for Bun API', () => {
	assert.deepEqual([...urlBase64ToUint8Array('AQIDBA')], [1, 2, 3, 4]);
	assert.deepEqual(subscriptionPayload({ toJSON: () => ({
		endpoint: 'https://push.example/subscription',
		keys: { p256dh: 'public', auth: 'secret' },
		expirationTime: null
	}) }), {
		endpoint: 'https://push.example/subscription',
		keys: { p256dh: 'public', auth: 'secret' }
	});
});
