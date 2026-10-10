<script>
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { ORDER_STATUS_OPTIONS, canonicalOrderStatus, needsDeliveryProof } from '$lib/order-delivery-proof.js';

	let { order, onProofRequired, onUpdated, disabled = false } = $props();
	let submitting = $state(false);
	let value = $state('Pending');
	$effect(() => { value = canonicalOrderStatus(order.status); });
</script>

<form method="POST" action="?/updateStatus" use:enhance={({ formData, cancel }) => {
	const target = String(formData.get('status'));
	if (submitting || disabled || target === canonicalOrderStatus(order.status)) {
		cancel();
		return;
	}
	if (needsDeliveryProof(order, target)) {
		cancel();
		value = canonicalOrderStatus(order.status);
		onProofRequired?.(order, target);
		return;
	}
	submitting = true;
	return async ({ result, update }) => {
		try {
			if (result.type === 'success' && result.data?.success) {
				onUpdated?.(result.data.order);
				toast.success('Status pesanan berhasil diubah.');
			} else if (result.type === 'failure') {
				value = canonicalOrderStatus(order.status);
				toast.error(result.data?.error || 'Gagal mengubah status.');
			} else if (result.type === 'error') {
				value = canonicalOrderStatus(order.status);
				toast.error('Gagal mengubah status. Silakan coba kembali.');
			}
			await update({ reset: false });
		} finally { submitting = false; }
	};
}}>
	<input type="hidden" name="id" value={order.id} />
	<select name="status" aria-label="Status pesanan" bind:value disabled={submitting || disabled}
		class="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
		onchange={(event) => event.currentTarget.form.requestSubmit()}>
		{#each ORDER_STATUS_OPTIONS as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</form>
