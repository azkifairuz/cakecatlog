<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { uploadAdminOrderDeliveryProof, updateAdminOrderStatus } from '$lib/api/admin.js';
	import { getAdminToken } from '$lib/api/auth.js';
	import { adaptOrder } from '$lib/api/adapters.js';
	import { onDestroy, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { DELIVERY_PROOF_FIELDS, validateProofFile, orderStatusLabel, saveDeliveryProof } from '$lib/order-delivery-proof.js';

	let { open = $bindable(false), order, targetStatus = null, onUpdated } = $props();
	let submitting = $state(false);
	let errorMessage = $state('');
	let previews = $state({});
	let proofUploaded = $state(false);
	function clearPreviews() {
		for (const url of Object.values(previews)) URL.revokeObjectURL(url);
		previews = {};
	}
	$effect(() => {
		if (!open) {
			untrack(() => { clearPreviews(); errorMessage = ''; proofUploaded = false; });
		}
	});
	onDestroy(clearPreviews);
	function choosePhoto(event, field) {
		const file = event.currentTarget.files?.[0];
		if (previews[field.name]) URL.revokeObjectURL(previews[field.name]);
		previews = { ...previews, [field.name]: null };
		if (!file) return;
		const error = validateProofFile(file);
		if (error) {
			errorMessage = `${field.label}: ${error}`;
			event.currentTarget.value = '';
			return;
		}
		errorMessage = '';
		previews = { ...previews, [field.name]: URL.createObjectURL(file) };
	}
</script>

<Dialog.Root {open} onOpenChange={(value) => { if (!submitting) open = value; }}>
	<Dialog.Content class="z-[100] flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl" showCloseButton={!submitting}
		onEscapeKeydown={(event) => { if (submitting) event.preventDefault(); }}
		onInteractOutside={(event) => { if (submitting) event.preventDefault(); }}>
		<Dialog.Header>
			<Dialog.Title>Bukti SOP pengiriman</Dialog.Title>
			<Dialog.Description>
				Pesanan #{order?.order_number || order?.orderNumber}. Lengkapi tiga foto{targetStatus ? ` sebelum mengubah status ke ${orderStatusLabel(targetStatus)}` : ''}. Maksimal 5 MB per foto.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/uploadDeliveryProof" enctype="multipart/form-data" class="flex min-h-0 flex-col gap-4" use:enhance={async ({ formData, cancel }) => {
			cancel();
			if (submitting) { cancel(); return; }
			if (!proofUploaded) {
				for (const field of DELIVERY_PROOF_FIELDS) {
					const error = validateProofFile(formData.get(field.name));
					if (error) { errorMessage = `${field.label}: ${error}`; cancel(); return; }
				}
			}
			submitting = true;
			errorMessage = '';
			try {
				let token = getAdminToken();
				if (!token) {
					// Restore cookie-only sessions through a small authenticated action.
					const response = await fetch('?/deliveryProofSession', { method: 'POST', headers: { 'x-sveltekit-action': 'true', 'content-type': 'application/x-www-form-urlencoded' }, body: '' });
					const session = deserialize(await response.text());
					if (session.type === 'redirect') { await goto(session.location); return; }
					token = session.data?.token;
					if (!token) throw new Error('Sesi admin tidak tersedia. Silakan masuk kembali.');
				}
				const files = Object.fromEntries(DELIVERY_PROOF_FIELDS.map(({ name }) => [name, formData.get(name)]));
				const result = await saveDeliveryProof({
					id: order.id, status: targetStatus, files, retryStatus: proofUploaded, token,
					upload: uploadAdminOrderDeliveryProof, update: updateAdminOrderStatus
				});
				onUpdated?.(adaptOrder(result.order));
				toast.success(targetStatus ? 'Bukti tersimpan dan status pesanan berhasil diubah.' : 'Tiga foto bukti pengiriman berhasil disimpan.');
				open = false;
			} catch (error) {
				errorMessage = error.message || 'Gagal menyimpan bukti. Silakan coba kembali.';
				if (error.proofUploaded) {
					proofUploaded = true;
					if (error.savedOrder) onUpdated?.(adaptOrder(error.savedOrder));
				}
			} finally {
				submitting = false;
				await invalidateAll();
			}

		}}>
			<div class="min-h-0 space-y-4 overflow-y-auto">
			<input type="hidden" name="id" value={order?.id} />
			<input type="hidden" name="status" value={targetStatus || ''} />
			<input type="hidden" name="retryStatus" value={proofUploaded ? 'true' : 'false'} />
			{#if proofUploaded}
				<p class="rounded-lg bg-muted p-3 text-sm">Ketiga foto sudah tersimpan. Coba kembali untuk mengubah status tanpa upload ulang.</p>
			{:else}
				{#each DELIVERY_PROOF_FIELDS as field}
					<div class="space-y-2">
						<label for={`proof-${field.name}`} class="block text-sm font-semibold">{field.label} <span aria-hidden="true">*</span></label>
						<input id={`proof-${field.name}`} type="file" name={field.name} required disabled={submitting}
							accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" class="block w-full rounded-lg border border-input p-2 text-sm"
							onchange={(event) => choosePhoto(event, field)} />
						{#if previews[field.name]}
							<img src={previews[field.name]} alt={`Preview ${field.label.toLowerCase()}`} class="max-h-36 w-full rounded-lg object-contain bg-muted" />
						{/if}
					</div>
				{/each}
			{/if}
			{#if errorMessage}<p role="alert" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errorMessage}</p>{/if}
			</div>
			<div class="flex shrink-0 justify-end gap-2 border-t border-border pt-3">
				<Button type="button" variant="outline" disabled={submitting} onclick={() => { open = false; }}>Batal</Button>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Menyimpan…' : proofUploaded ? 'Coba ubah status lagi' : targetStatus ? 'Upload dan ubah status' : 'Simpan tiga foto'}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>
