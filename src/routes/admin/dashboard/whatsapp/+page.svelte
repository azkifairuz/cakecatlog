<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminStatusBadge from '$lib/components/admin/AdminStatusBadge.svelte';

	let { data, form } = $props();
	let currentState = $state({ status: 'idle', qr: null, message: 'Memuat status WhatsApp.' });
	let pollingTimer = null;
	let disconnecting = $state(false);
	let refreshing = $state(false);

	const statusLabels = {
		idle: 'Belum diinisialisasi',
		connecting: 'Sedang menghubungkan',
		qr: 'Menunggu QR dipindai',
		connected: 'Terhubung',
		logged_out: 'Sesi telah keluar',
		error: 'Terjadi gangguan'
	};

	let statusCode = $derived(currentState?.status ?? 'error');
	let statusLabel = $derived(statusLabels[statusCode] ?? currentState?.message ?? 'Status tidak diketahui');
	let qrImage = $derived(currentState?.qr?.dataUrl ?? null);
	let isConnected = $derived(statusCode === 'connected');

	$effect(() => {
		currentState = data.whatsapp;
	});

	function scheduleStatusCheck(delay = 8_000) {
		if (pollingTimer) clearTimeout(pollingTimer);
		if (document.hidden) return;
		pollingTimer = setTimeout(checkStatus, delay);
	}

	async function checkStatus() {
		if (document.hidden) return;

		try {
			const response = await fetch('/admin/dashboard/whatsapp/status', {
				headers: { Accept: 'application/json' }
			});
			const result = await response.json();
			currentState = result;

			if (response.status === 429) {
				const retryAfter = Number.parseInt(response.headers.get('Retry-After') ?? '', 10);
				scheduleStatusCheck(Number.isFinite(retryAfter) ? retryAfter * 1_000 : 60_000);
				return;
			}
		} catch {
			currentState = {
				status: 'error',
				qr: null,
				message: 'Tidak dapat menghubungi server aplikasi.'
			};
		}

		scheduleStatusCheck();
	}

	async function refreshPairing() {
		refreshing = true;
		await invalidateAll();
		refreshing = false;
		scheduleStatusCheck();
	}

	onMount(() => {
		const handleVisibilityChange = () => {
			if (!document.hidden) checkStatus();
			else if (pollingTimer) clearTimeout(pollingTimer);
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		scheduleStatusCheck();

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			if (pollingTimer) clearTimeout(pollingTimer);
		};
	});
</script>

<AdminPage class="max-w-2xl">
	<AdminPageHeader eyebrow="Integrasi" title="WhatsApp Gateway" description="Hubungkan WhatsApp untuk mengirim invoice dan notifikasi pesanan kepada pelanggan." />

	<Card.Root class="overflow-hidden">
		<Card.Header class="border-b">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<MessageCircleIcon class="text-primary" />
					<div class="flex flex-col gap-1">
						<Card.Title>Status Koneksi</Card.Title>
						<Card.Description>{statusLabel} · {currentState?.message}</Card.Description>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<AdminStatusBadge status={isConnected ? 'active' : 'pending'} label={statusLabel} />
					{#if isConnected}
						<form
							method="POST"
							action="?/logout"
							use:enhance={() => {
								disconnecting = true;
								return async ({ update }) => {
									await update({ reset: false, invalidateAll: true });
									disconnecting = false;
									scheduleStatusCheck();
								};
							}}
						>
							<Button type="submit" variant="destructive" disabled={disconnecting}>
								{#if disconnecting}<Spinner data-icon="inline-start" />{/if}
								{disconnecting ? 'Memutus...' : 'Logout'}
							</Button>
						</form>
					{/if}
				</div>
			</div>
		</Card.Header>

		<Card.Content class="flex min-h-96 flex-col items-center justify-center pt-6 text-center">
			{#if isConnected}
				<div class="flex max-w-sm flex-col items-center gap-4 py-8">
					<div class="flex size-20 items-center justify-center rounded-full bg-primary/10">
						<CheckCircle2Icon class="size-10 text-primary" />
					</div>
					<div class="flex flex-col gap-2">
						<h3 class="text-xl font-bold">WhatsApp Terhubung</h3>
						<p class="text-sm text-muted-foreground">Invoice dapat dikirim melalui halaman <a href="/admin/dashboard/orders" class="font-semibold text-primary underline">Daftar Pesanan</a>.</p>
					</div>
				</div>
			{:else if qrImage}
				<div class="flex max-w-sm flex-col items-center gap-5">
					<div class="rounded-2xl border bg-background p-4 shadow-sm">
						<img src={qrImage} alt="WhatsApp QR Code" class="size-64" />
					</div>
					<div class="flex flex-col gap-2">
						<h3 class="text-lg font-bold">Scan QR Code Ini</h3>
						<p class="text-sm text-muted-foreground">Buka WhatsApp, pilih <strong>Linked devices</strong>, lalu pilih <strong>Link a device</strong> dan arahkan kamera ke QR code.</p>
					</div>
				</div>
			{:else}
				<div class="flex max-w-sm flex-col items-center gap-4 py-8">
					{#if statusCode === 'connecting' || statusCode === 'idle'}
						<Spinner class="size-8 text-primary" />
					{:else}
						<MessageCircleIcon class="size-10 text-muted-foreground" />
					{/if}
					<div class="flex flex-col gap-2">
						<p class="font-medium">{currentState?.message ?? statusLabel}</p>
						<p class="text-sm text-muted-foreground">QR akan tampil setelah gateway siap menerima koneksi.</p>
					</div>
					{#if statusCode === 'error' || statusCode === 'logged_out' || statusCode === 'idle'}
						<Button type="button" variant="outline" disabled={refreshing} onclick={refreshPairing}>
							{#if refreshing}<Spinner data-icon="inline-start" />{:else}<RefreshCwIcon data-icon="inline-start" />{/if}
							Coba lagi
						</Button>
					{/if}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if form?.message}
		<Alert.Root variant="destructive">
			<Alert.Title>Logout gagal</Alert.Title>
			<Alert.Description>{form.message}</Alert.Description>
		</Alert.Root>
	{/if}

	<Alert.Root>
		<Alert.Title>Penting</Alert.Title>
		<Alert.Description>
			<ul class="flex list-disc flex-col gap-1 pl-5">
				<li>Hanya satu akun WhatsApp yang dikelola gateway ini.</li>
				<li>Logout menghapus credential gateway dan memerlukan scan QR baru.</li>
			</ul>
		</Alert.Description>
	</Alert.Root>
</AdminPage>
