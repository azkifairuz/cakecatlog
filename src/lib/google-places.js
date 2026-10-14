/** A single lazy browser loader; importing this module is safe during SSR. */
export function createGooglePlacesLoader(win, doc, timeoutMs = 10000) {
	let pending;
	return function load(apiKey) {
		if (!apiKey?.trim()) return Promise.reject(new Error('MAPS_NOT_CONFIGURED'));
		if (!pending) {
			pending = (async () => {
				if (!win.google?.maps?.importLibrary) {
					await new Promise((resolve, reject) => {
						const script = doc.createElement('script');
						const callback = '__dessertByFirMapsReady';
						const finish = (error) => {
							clearTimeout(timer);
							delete win[callback];
							script.onerror = null;
							if (error) { script.remove(); reject(error); } else resolve();
						};
						const timer = setTimeout(() => finish(new Error('MAPS_TIMEOUT')), timeoutMs);
						win[callback] = () => finish();
						script.onerror = () => finish(new Error('MAPS_LOAD_FAILED'));
						const params = new URLSearchParams({ key: apiKey.trim(), v: 'weekly', loading: 'async', callback, language: 'id', region: 'ID' });
						script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
						script.async = true;
						script.defer = true;
						doc.head.appendChild(script);
					});
				}
				return win.google.maps.importLibrary('places');
			})();
			// Preserve the failure for this page instead of injecting repeated failing scripts.
		}
		return pending;
	};
}
let browserLoader;
export function loadGooglePlaces(apiKey) {
	if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.reject(new Error('MAPS_BROWSER_ONLY'));
	browserLoader ??= createGooglePlacesLoader(window, document);
	return browserLoader(apiKey);
}
