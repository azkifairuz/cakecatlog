const TOKEN_STORAGE_KEY = 'admin_access_token';

function sessionError(message, status) {
	return Object.assign(new Error(message), { status, code: `HTTP_${status}` });
}

// A factory keeps browser session state isolated and makes storage/network failures testable.
export function createAdminSession({ getBrowser, fetchSession }) {
	let token = null;
	let ready = false;
	let recovery;
	let invalidation;
	let generation = 0;
	const listeners = new Set();

	function store(value) {
		token = value || null;
		try {
			const storage = getBrowser()?.localStorage;
			if (token) storage?.setItem(TOKEN_STORAGE_KEY, token);
			else storage?.removeItem(TOKEN_STORAGE_KEY);
		} catch {
			// iOS can deny storage; the in-memory token remains usable.
		}
	}

	function getToken() {
		return getBrowser() ? token : null;
	}

	function setToken(value) {
		if (!getBrowser()) return;
		generation += 1;
		recovery = undefined;
		invalidation = undefined;
		ready = Boolean(value);
		store(value);
	}

	async function invalidate() {
		const browser = getBrowser();
		if (!browser) return;
		if (invalidation) return invalidation;
		generation += 1;
		ready = false;
		store(null);
		const currentGeneration = generation;
		invalidation = Promise.resolve().then(async () => {
			for (const listener of listeners) listener();
			const response = await fetchSession('/admin/session', {
				method: 'DELETE', credentials: 'same-origin', cache: 'no-store',
				signal: AbortSignal.timeout(10_000)
			});
			if (!response.ok || response.redirected) {
				throw sessionError('Sesi gagal dihapus. Coba masuk kembali setelah koneksi pulih.', 503);
			}
			if (currentGeneration === generation && browser.location.pathname.startsWith('/admin') && browser.location.pathname !== '/admin/login') {
				browser.location.replace('/admin/login');
			}
		}).catch(() => {
			throw Object.assign(sessionError('Sesi gagal dihapus. Coba masuk kembali setelah koneksi pulih.', 503), {
				code: 'SESSION_INVALIDATION_FAILED'
			});
		});
		return invalidation;
	}

	async function ensure() {
		if (!getBrowser()) return null;
		if (invalidation) {
			await invalidation;
			throw sessionError('Sesi admin berakhir. Silakan masuk kembali.', 401);
		}
		if (ready && token) return token;
		if (!recovery) {
			const currentGeneration = generation;
			recovery = Promise.resolve().then(async () => {
				const response = await fetchSession('/admin/session', {
					method: 'POST', credentials: 'same-origin', cache: 'no-store',
					signal: AbortSignal.timeout(10_000)
				});
				if (currentGeneration !== generation) throw sessionError('Sesi admin telah berubah.', 503);
				if (response.status === 401) {
					await invalidate();
					throw sessionError('Sesi admin berakhir. Silakan masuk kembali.', 401);
				}
				if (!response.ok || response.redirected) throw sessionError('Sesi admin belum dapat dipulihkan.', 503);
				const result = await response.json();
				if (currentGeneration !== generation) throw sessionError('Sesi admin telah berubah.', 503);
				if (!result.token) throw sessionError('Sesi admin belum dapat dipulihkan.', 503);
				store(result.token);
				ready = true;
				return token;
			}).catch((error) => {
				if (error.status) throw error;
				throw sessionError('Sesi admin belum dapat dipulihkan. Periksa koneksi Anda.', 503);
			}).finally(() => {
				if (currentGeneration === generation) recovery = undefined;
			});
		}
		return recovery;
	}

	return { getToken, setToken, ensure, invalidate, onInvalidated: (listener) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	} };
}

const session = createAdminSession({
	getBrowser: () => typeof window === 'undefined' ? null : window,
	fetchSession: (...args) => fetch(...args)
});

export const getAdminToken = session.getToken;
export const setAdminToken = session.setToken;
export const clearAdminToken = () => session.setToken(null);
export const ensureAdminSession = session.ensure;
export const invalidateAdminSession = session.invalidate;
export const onAdminSessionInvalidated = session.onInvalidated;
