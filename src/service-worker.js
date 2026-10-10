import { build, files, version } from '$service-worker';

const CACHE_PREFIX = 'dessertbyfir-static-';
const CACHE_NAME = `${CACHE_PREFIX}${version}`;
const ASSETS = [...new Set([...build, ...files])];
const ASSET_PATHS = new Set(ASSETS);

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
					.map((key) => caches.delete(key))
			)
		)
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin || !ASSET_PATHS.has(url.pathname)) return;

	event.respondWith(
		caches.match(request).then((cached) => cached ?? fetch(request))
	);
});

self.addEventListener('push', (event) => {
	let payload;
	try {
		payload = event.data?.json();
	} catch {
		payload = null;
	}

	const notification = {
		id: payload?.id ?? null,
		title: payload?.title || 'Notifikasi baru',
		body: payload?.body || 'Buka halaman Notifikasi untuk melihat detail.'
	};

	event.waitUntil((async () => {
		const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
		const visibleAdminClients = clients.filter((client) => {
			const url = new URL(client.url);
			return url.origin === self.location.origin &&
				url.pathname.startsWith('/admin/dashboard') &&
				client.visibilityState === 'visible';
		});

		for (const client of visibleAdminClients) {
			client.postMessage({ type: 'admin-notification', notification });
		}

		// Safari requires a visible system notification for every Web Push delivery.
		const isIOS = /iPad|iPhone|iPod/.test(self.navigator.userAgent);
		const isSafari = /Safari/.test(self.navigator.userAgent) && !/Chrome|CriOS|Edg|FxiOS/.test(self.navigator.userAgent);
		if (visibleAdminClients.length && !isIOS && !isSafari) return;

		await self.registration.showNotification(notification.title, {
			body: notification.body,
			icon: '/icons/icon-192.png',
			badge: '/icons/icon-192.png',
			tag: 'dessertbyfir-admin-notifications',
			renotify: false,
			data: { url: '/admin/dashboard/notifications', id: notification.id }
		});
	})());
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil((async () => {
		const target = new URL(event.notification.data?.url || '/admin/dashboard/notifications', self.location.origin).href;
		const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
		const existing = clients.find((client) => new URL(client.url).origin === self.location.origin && 'navigate' in client);
		if (existing) {
			await existing.navigate(target);
			await existing.focus();
		} else {
			await self.clients.openWindow(target);
		}
	})());
});
