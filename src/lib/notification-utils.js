export const SOUND_COOLDOWN_MS = 60_000;
export const TOAST_BURST_MS = 10_000;
const SOUND_KEY = 'dessertbyfir:last-notification-sound';
let lastSoundWithoutStorage = 0;

export function createSseParser(onEvent) {
	let buffer = '';
	let eventName = 'message';
	let data = [];

	function dispatch() {
		if (data.length) onEvent(eventName, data.join('\n'));
		eventName = 'message';
		data = [];
	}

	return {
		feed(chunk) {
			buffer += chunk;
			let end;
			while ((end = buffer.indexOf('\n')) !== -1) {
				const line = buffer.slice(0, end).replace(/\r$/, '');
				buffer = buffer.slice(end + 1);
				if (!line) {
					dispatch();
				} else if (line.startsWith('event:')) {
					eventName = line.slice(6).trimStart();
				} else if (line.startsWith('data:')) {
					data.push(line.slice(5).trimStart());
				}
			}
		},
		end() {
			if (buffer) this.feed('\n');
			dispatch();
		}
	};
}

export async function readSseStream(stream, onEvent) {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	const parser = createSseParser(onEvent);
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;
			parser.feed(decoder.decode(value, { stream: true }));
		}
		parser.feed(decoder.decode());
		parser.end();
	} finally {
		reader.releaseLock();
	}
}

export function isNewNotification(seenIds, notification) {
	if (!notification?.id || seenIds.has(notification.id)) return false;
	seenIds.add(notification.id);
	if (seenIds.size > 200) seenIds.delete(seenIds.values().next().value);
	return true;
}

export function shouldPlayNotificationSound(lastPlayedAt, now = Date.now()) {
	return now - lastPlayedAt >= SOUND_COOLDOWN_MS;
}

export function claimNotificationSound(storage, now = Date.now()) {
	let lastPlayedAt = lastSoundWithoutStorage;
	try {
		if (storage) lastPlayedAt = Number(storage.getItem(SOUND_KEY) || 0);
	} catch {
		// Use the per-tab fallback if storage is blocked.
	}
	if (!shouldPlayNotificationSound(lastPlayedAt, now)) return false;
	lastSoundWithoutStorage = now;
	try {
		storage?.setItem(SOUND_KEY, String(now));
	} catch {
		// The per-tab fallback still prevents repeated sounds.
	}
	return true;
}

export function urlBase64ToUint8Array(value) {
	const padding = '='.repeat((4 - (value.length % 4)) % 4);
	const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(base64);
	return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function subscriptionPayload(subscription) {
	const json = subscription.toJSON();
	return {
		endpoint: json.endpoint,
		keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth }
	};
}
