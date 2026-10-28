/** State orchestration is independent of the DOM so races and debounce can be tested. */
export function createAddressAutocomplete({ search, onState, onAddress, debounceMs = 300, limit = 5, setTimer = setTimeout, clearTimer = clearTimeout }) {
	let generation = 0;
	let timer;
	let active = true;
	let controller;
	let selected = '';
	const publish = (state) => { if (active) onState({ items: [], loading: false, error: '', ...state }); };
	const cancelPending = () => {
		generation++;
		if (timer !== undefined) clearTimer(timer);
		timer = undefined;
		controller?.abort();
		controller = undefined;
	};
	async function run(query, version) {
		if (!active || version !== generation) return;
		publish({ loading: true });
		controller = typeof AbortController === 'undefined' ? undefined : new AbortController();
		try {
			const results = await search(query, { limit, signal: controller?.signal });
			if (!active || version !== generation) return;
			const items = (results || []).slice(0, limit).map((item) => ({ id: item.code, text: item.label, postalCode: item.postalCode || '' }));
			publish({ items, error: items.length ? '' : 'EMPTY' });
		} catch { if (active && version === generation) publish({ error: 'UNAVAILABLE' }); }
	}
	return {
		update(value) {
			cancelPending(); publish({});
			const query = String(value || '').trim();
			if (query.length < 3) { selected = ''; return; }
			// The customer is completing street details after picking an area; keep the list closed.
			if (selected && query.startsWith(selected)) return;
			selected = '';
			const version = generation;
			timer = setTimer(() => { timer = undefined; void run(query, version); }, debounceMs);
		},
		select(item) {
			cancelPending();
			selected = `${item.text}${item.postalCode ? ` ${item.postalCode}` : ''}`;
			onAddress(selected);
			publish({});
		},
		dismiss() { cancelPending(); publish({}); },
		destroy() { active = false; cancelPending(); },
	};
}
