<script>
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { loadGooglePlaces } from '$lib/google-places.js';
	import { createAddressAutocomplete } from '$lib/address-autocomplete.js';

	let { id = 'address', name = 'address', value = $bindable(''), required = true, disabled = false, placeholder = 'Ketik alamat, misalnya Jakarta…', label = 'Alamat pengiriman', locale = 'id' } = $props();
	let state = $state({ items: [], loading: false, error: '' });
	let highlighted = $state(-1);
	let controller;
	let focused = $state(false);
	const messages = {
		id: { help: 'Pilih saran atau ketik alamat lengkap. Tambahkan nomor rumah, RT/RW, dan patokan bila perlu.', MANUAL: 'Ketik alamat lengkap secara manual.', UNAVAILABLE: 'Saran alamat belum tersedia. Anda tetap bisa mengetik alamat manual.', EMPTY: 'Lokasi belum ditemukan. Lanjutkan dengan alamat lengkap secara manual.', loading: 'Mencari alamat…' },
		en: { help: 'Choose a suggestion or enter the full address. Add the house number and delivery instructions as needed.', MANUAL: 'Enter the full address manually.', UNAVAILABLE: 'Address suggestions are unavailable. You can still enter your address manually.', EMPTY: 'No locations found. Continue entering the full address manually.', loading: 'Searching for addresses…' },
	};
	let text = $derived(messages[locale] || messages.id);
	onMount(() => {
		controller = createAddressAutocomplete({
			getPlaces: () => loadGooglePlaces(env.PUBLIC_GOOGLE_MAPS_API_KEY),
			onState: (next) => { state = next; highlighted = -1; },
			onAddress: (address) => { value = address; },
		});
		return () => controller.destroy();
	});
	function keydown(event) {
		if (event.key === 'Escape') { controller?.dismiss(); return; }
		if (!state.items.length) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			highlighted = event.key === 'ArrowDown' ? (highlighted + 1) % state.items.length : (highlighted < 0 ? state.items.length - 1 : (highlighted - 1 + state.items.length) % state.items.length);
		} else if (event.key === 'Enter' && highlighted >= 0) {
			event.preventDefault(); void controller.select(state.items[highlighted]);
		} else if (event.key === 'Tab') controller?.dismiss();
	}
</script>

<div class="relative">
	<input {id} {name} type="text" bind:value {required} {disabled} {placeholder} autocomplete="off" role="combobox" aria-label={label} aria-autocomplete="list" aria-expanded={focused && state.items.length > 0} aria-controls={`${id}-suggestions`} aria-activedescendant={highlighted >= 0 ? `${id}-option-${highlighted}` : undefined} aria-describedby={`${id}-help ${id}-status`} oninput={(event) => controller?.update(event.currentTarget.value)} onkeydown={keydown} onfocus={() => { focused = true; controller?.update(value); }} onblur={() => { focused = false; controller?.dismiss(); }} class="w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-4 py-3.5 text-sm text-[#4A3B32] outline-none focus:border-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60" />
	{#if focused && state.items.length}
		<div class="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-primary/20 bg-white shadow-lg">
			<ul id={`${id}-suggestions`} role="listbox" aria-label={label} class="max-h-64 overflow-y-auto">
				{#each state.items as item, index (item.id)}
					<li id={`${id}-option-${index}`} role="option" aria-selected={highlighted === index} class="border-b border-primary/10 last:border-0">
						<button type="button" tabindex="-1" onpointerdown={(event) => event.preventDefault()} onclick={() => controller.select(item)} class={`w-full px-4 py-3 text-left text-sm text-[#4A3B32] hover:bg-primary/5 ${highlighted === index ? 'bg-primary/10' : ''}`}>{item.text}</button>
					</li>
				{/each}
			</ul>
			<div class="flex justify-end px-3 py-2"><span translate="no" class="whitespace-nowrap font-sans text-[13px] font-normal not-italic tracking-normal text-[#5E5E5E]">Google Maps</span></div>
		</div>
	{/if}
	<p id={`${id}-help`} class="mt-2 text-xs leading-5 text-[#4A3B32]/65">{text.help}</p>
	<p id={`${id}-status`} role="status" aria-live="polite" class="text-xs leading-5 text-[#4A3B32]/65">{state.loading ? text.loading : text[state.error] || ''}</p>
</div>
