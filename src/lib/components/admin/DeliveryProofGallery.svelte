<script>
	import { DELIVERY_PROOF_FIELDS, isDeliveryOrder, hasDeliveryProof } from '$lib/order-delivery-proof.js';
	let { order, onReplace, disabled = false } = $props();
</script>

{#if isDeliveryOrder(order)}
	<section class="space-y-3 rounded-xl border border-border bg-muted/20 p-4" aria-label="Bukti SOP pengiriman">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h4 class="text-sm font-bold">Bukti SOP pengiriman</h4>
			<button type="button" class="text-sm font-semibold underline underline-offset-4 disabled:opacity-50" disabled={disabled} onclick={() => onReplace?.(order)}>
				{hasDeliveryProof(order) ? 'Ganti tiga foto' : 'Upload tiga foto'}
			</button>
		</div>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{#each DELIVERY_PROOF_FIELDS as field}
				{@const url = order[field.url] || order[field.alias]}
				<div class="space-y-1.5">
					<p class="text-xs font-semibold">{field.label}</p>
					{#if url}
						<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Buka ${field.label.toLowerCase()}`}>
							<img src={url} alt={field.label} class="h-28 w-full rounded-lg border border-border object-cover" loading="lazy" />
						</a>
					{:else}
						<p class="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">Belum diunggah</p>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}
