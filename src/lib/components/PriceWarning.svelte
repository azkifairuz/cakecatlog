<script>
	import { priceWarningMessage } from '$lib/price-notice.js';
	let { warning, locale = 'id', completed = false } = $props();
</script>

{#if warning}
	<div role="status" aria-live="polite" class="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
		{priceWarningMessage(warning, locale, completed)}
	</div>
{/if}
