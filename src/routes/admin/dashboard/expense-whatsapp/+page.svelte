<script>
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminStatusBadge from '$lib/components/admin/AdminStatusBadge.svelte';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Save from '@lucide/svelte/icons/save';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { data, form } = $props();
	let senderNumber = $state(untrack(() => form?.values?.senderNumber ?? form?.config?.senderNumber ?? data.config?.senderNumber ?? ''));
	let enabled = $state(untrack(() => form?.values?.enabled ?? form?.config?.enabled ?? data.config?.enabled ?? false));
	let saving = $state(false);
	let savedConfig = $derived(form?.config ?? data.config);

	$effect(() => {
		const values = form?.values ?? form?.config ?? data.config;
		senderNumber = values?.senderNumber ?? '';
		enabled = values?.enabled ?? false;
	});

	function save({ cancel }) {
		if (saving || data.loadError) { cancel(); return; }
		saving = true;
		return async ({ update }) => {
			try { await update({ reset: false, invalidateAll: false }); }
			finally { saving = false; }
		};
	}
</script>

<AdminPage class="max-w-3xl">
	<AdminPageHeader eyebrow="Pengaturan" title="WhatsApp Pengeluaran" description="Tentukan nomor pengirim yang boleh mencatat pengeluaran melalui WhatsApp.">
		{#snippet actions()}
			<Button href="/admin/dashboard/expenses" variant="outline"><ArrowLeft class="size-4" />Pengeluaran</Button>
		{/snippet}
	</AdminPageHeader>

	{#if data.loadError}
		<div role="alert" class="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
			<p class="text-destructive">{data.loadError}</p>
			<Button href="/admin/dashboard/expense-whatsapp" variant="outline" data-sveltekit-reload>Muat ulang</Button>
		</div>
	{/if}
	{#if form?.error}<p role="alert" class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{form.error}</p>{/if}
	{#if form?.success}<p role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{form.message}</p>{/if}

	<section class="space-y-5 rounded-xl border bg-background p-5 sm:p-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex items-start gap-3">
				<div class="rounded-xl bg-primary/10 p-2.5 text-primary"><MessageCircle class="size-5" /></div>
				<div><h2 class="text-lg font-semibold">Nomor pengirim</h2><p class="mt-1 text-sm text-muted-foreground">Satu nomor untuk pencatatan pengeluaran toko.</p></div>
			</div>
			{#if !data.loadError}
				<AdminStatusBadge status={savedConfig?.enabled ? 'active' : 'pending'} label={savedConfig?.enabled ? 'Aktif' : savedConfig ? 'Nonaktif' : 'Belum dikonfigurasi'} />
			{/if}
		</div>
		<form method="POST" action="?/save" use:enhance={save} class="space-y-5" aria-busy={saving}>
			<fieldset disabled={saving || !!data.loadError} class="space-y-5">
				<div class="space-y-2">
					<Label for="expense-sender">Nomor WhatsApp pengirim</Label>
					<Input id="expense-sender" name="senderNumber" type="tel" inputmode="tel" autocomplete="tel" placeholder="081234567890" maxlength={50} required bind:value={senderNumber} aria-describedby="expense-sender-help" />
					<p id="expense-sender-help" class="text-xs leading-5 text-muted-foreground">Gunakan nomor pribadi yang akan mengirim catatan. Format 08… atau +62… diterima dan disimpan sebagai 62….</p>
				</div>
				<Switch id="expense-enabled" name="enabled" bind:checked={enabled} disabled={saving || !!data.loadError} label="Aktifkan pencatatan WhatsApp" description="Pesan hanya diproses dari nomor pengirim yang disimpan. Saat nonaktif, semua pesan diabaikan." />
				<div class="flex flex-wrap items-center gap-3">
					<Button type="submit" disabled={saving || !!data.loadError}><Save class="size-4" />{saving ? 'Menyimpan…' : 'Simpan konfigurasi'}</Button>
					<p class="text-xs text-muted-foreground">Perubahan berlaku setelah disimpan.</p>
				</div>
			</fieldset>
		</form>
	</section>

	<section class="space-y-3 rounded-xl border bg-background p-5 sm:p-6">
		<h2 class="font-semibold">Cara mencatat pengeluaran</h2>
		<p class="text-sm leading-6 text-muted-foreground">Kirim chat pribadi dari nomor yang diizinkan ke WhatsApp pencatatan pengeluaran toko dengan urutan nama pengeluaran, nominal, lalu kategori.</p>
		<code class="block break-words rounded-lg bg-muted p-4 text-sm">beli gula 25000 Bahan Baku</code>
		<p class="text-sm leading-6 text-muted-foreground">Nominal juga bisa ditulis 25.000. Kategori yang belum ada dibuat otomatis. Anda akan menerima balasan saat catatan berhasil disimpan atau perlu diperbaiki.</p>
		<p class="text-sm leading-6 text-muted-foreground">Pesan dari nomor lain, grup, dan lampiran diabaikan tanpa menyimpan data atau mengirim balasan.</p>
	</section>
</AdminPage>
