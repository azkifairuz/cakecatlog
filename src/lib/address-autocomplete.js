/** State orchestration is independent of the DOM so races and debounce can be tested. */
export function createAddressAutocomplete({ getPlaces, onState, onAddress, debounceMs = 300, setTimer = setTimeout, clearTimer = clearTimeout }) {
	let generation = 0;
	let timer;
	let active = true;
	let token;
	const publish = (state) => { if (active) onState({ items: [], loading: false, error: '', ...state }); };
	const cancelPending = () => { generation++; if (timer !== undefined) clearTimer(timer); timer = undefined; };
	async function search(query, version) {
		if (!active || version !== generation) return;
		publish({ loading: true });
		try {
			const places = await getPlaces();
			if (!active || version !== generation) return;
			token ??= new places.AutocompleteSessionToken();
			const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query, includedRegionCodes: ['id'], language: 'id', region: 'id', sessionToken: token });
			if (!active || version !== generation) return;
			const items = (suggestions || []).filter((item) => item.placePrediction).slice(0, 5).map(({ placePrediction }) => ({ id: placePrediction.placeId, text: placePrediction.text.toString(), prediction: placePrediction }));
			publish({ items, error: items.length ? '' : 'EMPTY' });
		} catch (error) { if (active && version === generation) publish({ error: error?.message === 'MAPS_NOT_CONFIGURED' ? 'MANUAL' : 'UNAVAILABLE' }); }
	}
	return {
		update(value) {
			cancelPending(); publish({});
			const query = String(value || '').trim();
			if (query.length < 3) { token = undefined; return; }
			const version = generation;
			timer = setTimer(() => { timer = undefined; void search(query, version); }, debounceMs);
		},
		async select(item) {
			cancelPending(); const version = generation; publish({ loading: true });
			try {
				const place = item.prediction.toPlace();
				await place.fetchFields({ fields: ['formattedAddress'] });
				if (!active || version !== generation) return;
				if (!place.formattedAddress) throw new Error('ADDRESS_MISSING');
				token = undefined;
				onAddress(place.formattedAddress); publish({});
			} catch { if (active && version === generation) { token = undefined; publish({ error: 'UNAVAILABLE' }); } }
		},
		dismiss() { cancelPending(); token = undefined; publish({}); },
		destroy() { active = false; cancelPending(); token = undefined; },
	};
}
