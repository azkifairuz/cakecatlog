<script>
	import { Button } from '$lib/components/ui/button';
	import { PUBLIC_WA_GATEWAY_URL } from '$env/static/public';
	import { onMount, onDestroy } from 'svelte';

	let waStatus = $state('Memuat...');
	let qrImage = $state(null);
	let isConnected = $state(false);
	let polling = $state(null);
	let disconnecting = $state(false);

	async function checkStatus() {
		try {
			const res = await fetch(`${PUBLIC_WA_GATEWAY_URL}/api/status`);
			const data = await res.json();

			if (data.success) {
				waStatus = data.status;
				qrImage = data.qr;
				isConnected = data.status === 'Terhubung';
			}
		} catch (err) {
			waStatus = 'Tidak dapat terhubung ke server gateway';
			qrImage = null;
			isConnected = false;
		}
	}

	async function disconnectWA() {
		disconnecting = true;
		try {
			await fetch(`${PUBLIC_WA_GATEWAY_URL}/api/disconnect`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'x-api-key': 'temp' }
			});
		} catch (err) {
			console.error('Disconnect error:', err);
		}
		disconnecting = false;
		// Will auto-update via polling
	}

	onMount(() => {
		checkStatus();
		polling = setInterval(checkStatus, 5000);
	});

	onDestroy(() => {
		if (polling) clearInterval(polling);
	});
</script>

<div class="space-y-8 max-w-2xl mx-auto">
	<!-- Header -->
	<div class="space-y-2">
		<div class="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Integrasi</div>
		<h1 class="text-3xl font-bold text-[#4A3B32]">WhatsApp Gateway</h1>
		<p class="text-sm text-[#4A3B32]/70">Hubungkan WhatsApp Anda untuk mengirim invoice dan notifikasi pesanan ke pelanggan secara langsung.</p>
	</div>

	<!-- Status Card -->
	<div class="bg-white rounded-3xl border border-primary/10 shadow-sm overflow-hidden">
		<!-- Status Bar -->
		<div class="flex items-center justify-between p-6 border-b border-primary/10">
			<div class="flex items-center gap-3">
				<div class="w-3 h-3 rounded-full {isConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-400 animate-pulse'}"></div>
				<div>
					<p class="font-bold text-[#4A3B32] text-[15px]">Status Koneksi</p>
					<p class="text-sm text-[#4A3B32]/70">{waStatus}</p>
				</div>
			</div>
			{#if isConnected}
				<Button 
					variant="outline" 
					class="rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-sm font-semibold px-5"
					onclick={disconnectWA}
					disabled={disconnecting}
				>
					{disconnecting ? 'Memutus...' : 'Disconnect'}
				</Button>
			{/if}
		</div>

		<!-- QR Code Area -->
		<div class="p-8 flex flex-col items-center">
			{#if isConnected}
				<!-- Connected State -->
				<div class="text-center py-8">
					<div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
						<svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
					</div>
					<h3 class="text-xl font-bold text-[#4A3B32] mb-2">WhatsApp Terhubung!</h3>
					<p class="text-sm text-[#4A3B32]/70 max-w-sm">Anda dapat mengirim invoice ke pelanggan melalui halaman <a href="/admin/dashboard/orders" class="underline text-primary font-semibold">Daftar Pesanan</a>.</p>
				</div>
			{:else if qrImage}
				<!-- QR Code State -->
				<div class="text-center">
					<div class="bg-white p-4 rounded-2xl border-2 border-primary/20 inline-block mb-6 shadow-sm">
						<img src={qrImage} alt="WhatsApp QR Code" class="w-64 h-64" />
					</div>
					<h3 class="text-lg font-bold text-[#4A3B32] mb-3">Scan QR Code Ini</h3>
					<div class="text-sm text-[#4A3B32]/70 space-y-1 max-w-sm">
						<p>1. Buka <strong>WhatsApp</strong> di HP Anda</p>
						<p>2. Ketuk <strong>Menu (⋮)</strong> atau <strong>Settings</strong></p>
						<p>3. Pilih <strong>Linked Devices</strong></p>
						<p>4. Ketuk <strong>"Link a Device"</strong></p>
						<p>5. Arahkan kamera ke QR code di atas</p>
					</div>
				</div>
			{:else}
				<!-- Loading / Waiting State -->
				<div class="text-center py-8">
					<div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5 animate-pulse">
						<svg class="w-8 h-8 text-[#4A3B32]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
					</div>
					<p class="text-sm text-[#4A3B32]/70 font-medium">{waStatus}</p>
					<p class="text-xs text-[#4A3B32]/50 mt-2">Menunggu koneksi ke server gateway...</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Info -->
	<div class="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800">
		<p class="font-bold mb-1">⚠️ Penting</p>
		<ul class="list-disc pl-5 space-y-1 text-amber-700">
			<li>Hanya 1 perangkat yang bisa terhubung ke WhatsApp Web pada saat bersamaan.</li>
			<li>Jika koneksi terputus, halaman ini akan otomatis menampilkan QR baru.</li>
		</ul>
	</div>
</div>
