<script>
	import { getContext } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import Download from '@lucide/svelte/icons/download';

	let { compact = false } = $props();
	const pwaInstall = getContext('pwa-install');
	let helpOpen = $state(false);

	async function install() {
		const prompt = pwaInstall.promptEvent;
		if (!prompt) {
			helpOpen = true;
			return;
		}

		pwaInstall.promptEvent = null;
		try {
			await prompt.prompt();
			const choice = await prompt.userChoice;
			if (choice?.outcome === 'accepted') pwaInstall.installed = true;
		} catch {
			helpOpen = true;
		}
	}
</script>

{#if pwaInstall.ready && !pwaInstall.installed}
	<Button
		variant="outline"
		size="sm"
		class="border-primary/30 bg-background text-primary hover:bg-primary/10 hover:text-primary"
		onclick={install}
	>
		<Download class="size-4" />
		{compact ? 'Pasang' : 'Pasang aplikasi'}
	</Button>
{/if}

<Dialog.Root bind:open={helpOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Pasang dessertbyfir</Dialog.Title>
			<Dialog.Description>
				{#if pwaInstall.platform === 'ios'}
					Tambahkan aplikasi ke Layar Utama dari Safari.
				{:else}
					Tambahkan aplikasi dari menu browser Anda.
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		{#if pwaInstall.platform === 'ios'}
			<ol class="list-inside list-decimal space-y-2 text-sm leading-relaxed">
				<li>Buka halaman ini di Safari.</li>
				<li>Ketuk tombol Bagikan (kotak dengan panah ke atas).</li>
				<li>Pilih <strong>Tambahkan ke Layar Utama</strong>, lalu ketuk <strong>Tambah</strong>.</li>
			</ol>
		{:else if pwaInstall.platform === 'android'}
			<p class="text-sm leading-relaxed">Buka menu browser (⋮), lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</p>
		{:else}
			<p class="text-sm leading-relaxed">Buka menu browser, lalu pilih <strong>Instal aplikasi</strong> jika tersedia.</p>
		{/if}
	</Dialog.Content>
</Dialog.Root>
