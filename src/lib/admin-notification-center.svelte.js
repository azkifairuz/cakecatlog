import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';
import { getAdminToken } from '$lib/api/auth.js';
import { getAdminUnreadCount, openAdminNotificationStream } from '$lib/api/notifications.js';
import {
	TOAST_BURST_MS,
	NOTIFICATIONS_URL,
	claimNotificationSound,
	getLastSoundStorage,
	isNewNotification,
	readSseStream
} from '$lib/admin-notifications.js';

export function createAdminNotificationCenter() {
	const state = $state({ unreadCount: 0, version: 0, available: true });
	const seenIds = new Set();
	let stopped = true;
	let controller;
	let retryTimer;
	let retryResolve;
	let streamStartedAt = 0;
	let audioContext;
	let lastToastAt = 0;
	let burstCount = 0;

	async function refreshCount() {
		try {
			const result = await getAdminUnreadCount();
			state.unreadCount = Math.max(0, Number(result?.count) || 0);
			state.available = true;
		} catch (error) {
			if (error?.status === 403 || error?.status === 401) state.available = false;
		}
	}

	function unlockAudio() {
		try {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext;
			if (!AudioContextClass) return;
			audioContext ??= new AudioContextClass();
			if (audioContext.state === 'suspended') void audioContext.resume();
		} catch {
			// Browser audio can be unavailable or blocked.
		}
	}

	function playChime() {
		if (!audioContext || audioContext.state !== 'running') return;
		const start = audioContext.currentTime;
		for (const [index, frequency] of [880, 1174.66].entries()) {
			const oscillator = audioContext.createOscillator();
			const gain = audioContext.createGain();
			const at = start + index * 0.11;
			oscillator.type = 'sine';
			oscillator.frequency.value = frequency;
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(0.075, at + 0.018);
			gain.gain.exponentialRampToValueAtTime(0.001, at + 0.24);
			oscillator.connect(gain).connect(audioContext.destination);
			oscillator.start(at);
			oscillator.stop(at + 0.25);
		}
	}

	function maybePlayChime() {
		if (!audioContext || audioContext.state !== 'running') return;
		const storage = getLastSoundStorage();
		const claim = () => {
			if (claimNotificationSound(storage)) playChime();
		};
		if (navigator.locks?.request) {
			void navigator.locks.request('dessertbyfir-notification-sound', claim);
		} else {
			claim();
		}
	}

	function received(notification) {
		if (!isNewNotification(seenIds, notification)) return;
		state.unreadCount += 1;
		state.version += 1;
		void refreshCount();
		if (document.visibilityState !== 'visible') return;

		const now = Date.now();
		burstCount = now - lastToastAt < TOAST_BURST_MS ? burstCount + 1 : 1;
		lastToastAt = now;
		toast.info(burstCount > 1 ? `${burstCount} notifikasi baru` : notification.title || 'Notifikasi baru', {
			id: 'admin-notification',
			description: notification.body || 'Buka halaman Notifikasi untuk melihat detail.',
			duration: 6000,
			closeButton: true,
			action: { label: 'Lihat', onClick: () => goto(NOTIFICATIONS_URL) }
		});
		maybePlayChime();
	}

	function onServiceWorkerMessage(event) {
		if (event.data?.type === 'admin-notification') received(event.data.notification);
	}

	function onVisibilityChange() {
		if (document.visibilityState === 'visible') void refreshCount();
	}

	function sleepRetry(milliseconds) {
		return new Promise((resolve) => {
			retryResolve = resolve;
			retryTimer = setTimeout(() => {
				retryTimer = undefined;
				retryResolve = undefined;
				resolve();
			}, milliseconds);
		});
	}

	async function connect() {
		let retry = 5000;
		while (!stopped) {
			if (!navigator.onLine) {
				await sleepRetry(retry);
				continue;
			}
			controller = new AbortController();
			streamStartedAt = 0;
			try {
				const response = await openAdminNotificationStream(getAdminToken(), controller.signal);
				if (!response.body) throw new Error('Stream notifikasi tidak tersedia');
				streamStartedAt = Date.now();
				await readSseStream(response.body, (eventName, rawData) => {
					if (eventName !== 'notification') return;
					try {
						received(JSON.parse(rawData));
					} catch {
						// Skip malformed events without interrupting the stream.
					}
				});
			} catch (error) {
				if (stopped || error?.name === 'AbortError') break;
				if (error?.status === 401 || error?.status === 403) {
					state.available = false;
					break;
				}
			}
			if (!stopped) {
				if (streamStartedAt && Date.now() - streamStartedAt > 30_000) retry = 5000;
				await sleepRetry(retry);
				retry = Math.min(retry * 2, 60_000);
			}
		}
	}

	function start() {
		if (!stopped) return;
		stopped = false;
		void refreshCount();
		if (getAdminToken()) void connect();
		else state.available = false;
		document.addEventListener('pointerdown', unlockAudio, { once: true });
		document.addEventListener('visibilitychange', onVisibilityChange);
		navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage);
	}

	function stop() {
		stopped = true;
		controller?.abort();
		clearTimeout(retryTimer);
		retryResolve?.();
		document.removeEventListener('pointerdown', unlockAudio);
		document.removeEventListener('visibilitychange', onVisibilityChange);
		navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage);
		void audioContext?.close();
	}

	return { state, start, stop, refreshCount, received };
}
