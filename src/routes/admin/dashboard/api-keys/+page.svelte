<script>
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Copy from '@lucide/svelte/icons/copy';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form } = $props();
	let password = $state('');
	let busy = $state('');
	let apiKey = $state(untrack(() => form?.apiKey || ''));
	let expiresAt = $state(untrack(() => form?.expiresAt || ''));
	let copied = $state(false);
	let copyError = $state('');

	$effect(() => {
		if (form?.success && form.action === 'generate') {
			apiKey = form.apiKey;
			expiresAt = form.expiresAt;
			copied = false;
			copyError = '';
		} else if (form?.success && form.action === 'remove') {
			apiKey = '';
			expiresAt = '';
			copied = false;
			copyError = '';
		}
	});

	function submitAction(action) {
		return ({ cancel }) => {
			if (busy) { cancel(); return; }
			busy = action;
			password = '';
			return async ({ update }) => {
				try { await update({ reset: true, invalidateAll: false }); }
				finally { busy = ''; }
			};
		};
	}

	async function copyKey() {
		copyError = '';
		try {
			await navigator.clipboard.writeText(apiKey);
			copied = true;
		} catch {
			copyError = 'Key belum dapat disalin otomatis. Pilih teks key dan salin secara manual.';
		}
	}

	function formatExpiry(value) {
		return new Date(value).toLocaleString('id-ID', {
			dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta'
		});
	}
</script>

<AdminPage class="max-w-4xl">
	<AdminPageHeader eyebrow="Integrasi" title="API key" description="Buat dan kelola API key akun Anda untuk mengakses API admin sesuai hak akses akun.">
		{#snippet actions()}
			<Button href="https://api.dessertbyfir.com/swagger" target="_blank" rel="noopener noreferrer" variant="outline">
				<ExternalLink class="size-4" /> Buka Swagger
			</Button>
		{/snippet}
	</AdminPageHeader>

	{#if form?.error}
		<p role="alert" class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{form.error}</p>
	{/if}
	{#if form?.message}
		<p role="status" class="rounded-xl border bg-background p-4 text-sm">{form.message}</p>
	{/if}

	<section class="space-y-4 rounded-xl border bg-background p-5 sm:p-6">
		<div class="flex items-start gap-3">
			<KeyRound class="mt-1 size-5 shrink-0 text-primary" />
			<div>
				<h2 class="text-lg font-semibold">Generate API key</h2>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">API key berlaku 30 hari. Generate ulang langsung membatalkan key lama akun ini.</p>
			</div>
		</div>
		<form method="POST" action="?/generate" use:enhance={submitAction('generate')} class="grid gap-4 sm:grid-cols-2" aria-busy={busy === 'generate'}>
			<div class="space-y-2">
				<Label for="api-key-username">Username akun</Label>
				<Input id="api-key-username" name="username" value={data.username} autocomplete="username" readonly required maxlength={100} />
			</div>
			<div class="space-y-2">
				<Label for="api-key-password">Password</Label>
				<Input id="api-key-password" name="password" type="password" bind:value={password} autocomplete="current-password" required maxlength={200} disabled={!!busy} />
			</div>
			<div class="sm:col-span-2">
				<Button type="submit" disabled={!!busy}><KeyRound class="size-4" />{busy === 'generate' ? 'Membuat API key…' : 'Generate API key'}</Button>
			</div>
		</form>
	</section>

	{#if apiKey}
		<section class="space-y-4 rounded-xl border bg-background p-5 sm:p-6" aria-label="API key baru">
			<div>
				<h2 class="text-lg font-semibold">API key baru</h2>
				<p class="mt-1 text-sm text-muted-foreground">Salin sekarang. Key lengkap tidak dapat ditampilkan kembali setelah meninggalkan halaman ini.</p>
			</div>
			<code class="block select-all break-all rounded-lg bg-muted p-4 font-mono text-sm">{apiKey}</code>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<p class="text-sm text-muted-foreground">Berlaku sampai <time datetime={expiresAt}>{formatExpiry(expiresAt)} WIB</time></p>
				<Button variant="outline" onclick={copyKey} disabled={!!busy}><Copy class="size-4" />{copied ? 'Tersalin' : 'Salin API key'}</Button>
			</div>
			{#if copyError}<p role="alert" class="text-sm text-destructive">{copyError}</p>{/if}
		</section>
	{/if}

	<section class="space-y-4 rounded-xl border bg-background p-5 sm:p-6">
		<div>
			<h2 class="text-lg font-semibold">Hapus API key</h2>
			<p class="mt-1 text-sm leading-6 text-muted-foreground">Cabut key aktif akun ini, termasuk key yang dibuat sebelumnya. Integrasi yang memakai key tersebut akan kehilangan akses.</p>
		</div>
		<form method="POST" action="?/remove" use:enhance={submitAction('remove')} class="space-y-4" aria-busy={busy === 'remove'}>
			<label class="flex items-start gap-2 text-sm">
				<input type="checkbox" name="confirmDelete" required disabled={!!busy} class="mt-1" />
				<span>Saya ingin menghapus API key aktif akun ini.</span>
			</label>
			<Button type="submit" variant="destructive" disabled={!!busy}><Trash2 class="size-4" />{busy === 'remove' ? 'Menghapus API key…' : 'Hapus API key'}</Button>
		</form>
	</section>
</AdminPage>
