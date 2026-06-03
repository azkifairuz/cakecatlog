<script>
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { fly, fade } from 'svelte/transition';
	
	let { data, form } = $props();

	function formatDate(dateString) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatCurrency(amount) {
		if (!amount) return '-';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}

	let selectedOrder = $state(null);
	let isDrawerOpen = $state(false);
	let uploadingReceipt = $state(false);

	// Filters State
	let todayStr = new Date().toISOString().split('T')[0];
	let searchQuery = $state('');
	let statusFilter = $state('All');
	let dateFilter = $state(todayStr);

	let filteredOrders = $derived(data.orders.filter(order => {
		const matchesSearch = !searchQuery || 
			order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
			order.order_number?.toString().includes(searchQuery);
		
		const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
		
		const matchesDate = !dateFilter || order.delivery_date === dateFilter;

		return matchesSearch && matchesStatus && matchesDate;
	}));

	function openDrawer(order) {
		selectedOrder = order;
		isDrawerOpen = true;
	}

	function closeDrawer() {
		isDrawerOpen = false;
		selectedOrder = null;
		uploadingReceipt = false;
	}
</script>

<div class="flex items-center mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Daftar Pesanan</h1>
</div>

<div class="flex flex-col sm:flex-row items-center gap-3 mb-6 bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-100">
	<!-- Search -->
	<div class="relative w-full sm:flex-1">
		<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
		<Input type="text" placeholder="Cari nama atau no order..." bind:value={searchQuery} class="pl-9 h-11 w-full rounded-xl bg-slate-50 border-transparent hover:border-slate-200 focus:border-slate-800 focus:bg-white transition-colors" />
	</div>
	
	<div class="flex items-center gap-3 w-full sm:w-auto">
		<!-- Date Filter -->
		<div class="w-full sm:w-auto">
			<Input type="date" bind:value={dateFilter} class="h-11 w-full rounded-xl bg-slate-50 border-transparent hover:border-slate-200 focus:border-slate-800 focus:bg-white text-slate-700 cursor-pointer text-sm" />
		</div>

		<!-- Status Filter -->
		<div class="w-full sm:w-auto">
			<select bind:value={statusFilter} class="h-11 w-full rounded-xl bg-slate-50 border-transparent hover:border-slate-200 focus:border-slate-800 focus:bg-white px-3 text-sm font-medium text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-800">
				<option value="All">Semua Status</option>
				<option value="Pending">Pending</option>
				<option value="Diperoses">Diperoses</option>
				<option value="Selesai">Selesai</option>
			</select>
		</div>
	</div>

	<!-- Reset Button -->
	{#if searchQuery || statusFilter !== 'All' || dateFilter !== todayStr}
		<Button variant="ghost" class="h-11 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0 w-full sm:w-auto" onclick={() => {
			searchQuery = '';
			statusFilter = 'All';
			dateFilter = todayStr;
		}}>
			Reset Filter
		</Button>
	{/if}
</div>

{#if form?.error}
	<div class="p-4 bg-red-50 text-red-600 font-medium text-sm rounded-xl mb-6 border border-red-100">
		Error: {form.error}
	</div>
{/if}

<div class="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
	{#each filteredOrders as order (order.id)}
		<Card.Root class="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
			<Card.Content class="p-5 flex flex-col gap-4">
				<!-- Header Card -->
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<p class="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">#{order.order_number}</p>
						<h3 class="font-bold text-slate-800 text-lg leading-tight truncate">{order.customer_name}</h3>
						<p class="text-[13px] text-slate-500 mt-0.5 truncate">{order.phone_number}</p>
					</div>
					<!-- Status Dropdown -->
					<form method="POST" action="?/updateStatus" use:enhance class="shrink-0">
						<input type="hidden" name="id" value={order.id} />
						<select name="status" class="text-xs sm:text-sm font-bold rounded-full border px-3 sm:px-4 py-2 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-colors cursor-pointer
							{order.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 
							 order.status === 'Diperoses' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
							 'bg-slate-50 text-slate-700 border-slate-200'}" 
							onchange={(e) => e.target.form.requestSubmit()}>
							<option value="Pending" selected={order.status === 'Pending'}>Pending</option>
							<option value="Diperoses" selected={order.status === 'Diperoses'}>Diperoses</option>
							<option value="Selesai" selected={order.status === 'Selesai'}>Selesai</option>
						</select>
					</form>
				</div>
				
				<!-- Detail Produk -->
				<div class="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex flex-col gap-2 text-sm text-slate-600">
					<p class="flex justify-between items-start gap-2">
						<span class="font-bold text-slate-700 leading-tight break-words flex-1">{order.products?.name ?? 'Unknown'}</span>
						<span class="font-medium text-[12px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 shrink-0">{order.cake_size}</span>
					</p>
					<div class="flex justify-between items-center text-[12px] sm:text-[13px]">
						<span>Qty: <span class="font-semibold text-slate-700">{order.quantity}</span></span>
						<span class="flex items-center gap-1 text-slate-500 text-right">
							<svg class="w-3.5 h-3.5 shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
							{formatDate(order.delivery_date)} &bull; {order.delivery_time}
						</span>
					</div>
				</div>

				<!-- Footer Card: Harga & Action -->
				<div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-1">
					<div>
						<p class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total Harga</p>
						<p class="font-bold text-slate-800 text-lg leading-none whitespace-nowrap">{formatCurrency(order.amount)}</p>
					</div>
					<Button variant="outline" size="sm" class="rounded-full shadow-sm font-semibold border-slate-300 text-slate-700 hover:bg-slate-50 shrink-0 whitespace-nowrap" onclick={() => openDrawer(order)}>
						Kelola Pesanan
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="col-span-full flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
			<svg class="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
			<p class="font-medium text-slate-500">
				{#if data.orders.length === 0}
					Belum ada pesanan masuk sama sekali.
				{:else}
					Tidak ada pesanan yang sesuai dengan filter.
				{/if}
			</p>
			{#if searchQuery || statusFilter !== 'All' || dateFilter !== ''}
				<Button variant="outline" size="sm" class="mt-4 rounded-full" onclick={() => {
					searchQuery = '';
					statusFilter = 'All';
					dateFilter = ''; // Show all dates
				}}>
					Tampilkan Semua Pesanan
				</Button>
			{/if}
		</div>
	{/each}
</div>

<!-- BOTTOM SHEET DRAWER -->
{#if isDrawerOpen && selectedOrder}
	<div class="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
		<!-- Backdrop -->
		<button class="absolute inset-0 w-full h-full bg-slate-900/40 backdrop-blur-sm cursor-default" transition:fade={{duration: 200}} onclick={closeDrawer} aria-label="Close modal"></button>
		
		<!-- Drawer Content -->
		<div class="relative bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-safe-12 w-full max-w-xl mx-auto" transition:fly={{ y: '100%', duration: 350, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}>
			<div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
			
			<div class="flex justify-between items-start mb-6">
				<div>
					<h3 class="text-xl font-bold text-slate-800 mb-1">Kelola Pesanan</h3>
					<p class="text-sm font-medium text-slate-500">#{selectedOrder.order_number} &bull; {selectedOrder.customer_name}</p>
				</div>
				<button onclick={closeDrawer} class="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>

			<div class="space-y-6 overflow-y-auto max-h-[70vh] pb-8 px-1">
				
				<!-- Form Update Status -->
				<div class="space-y-3">
					<Label class="text-slate-800 font-bold text-[15px]">Status Pesanan</Label>
					<form method="POST" action="?/updateStatus" use:enhance={() => {
						return async ({ update }) => {
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedOrder.id} />
						<select name="status" class="w-full text-[15px] font-bold rounded-xl border-2 px-4 py-4 focus:outline-none focus:ring-2 focus:ring-slate-800 transition-colors cursor-pointer shadow-sm
							{selectedOrder.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : 
							 selectedOrder.status === 'Diperoses' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
							 'bg-slate-50 text-slate-700 border-slate-200'}" 
							onchange={(e) => e.target.form.requestSubmit()}>
							<option value="Pending" selected={selectedOrder.status === 'Pending'}>Pending (Belum Diproses)</option>
							<option value="Diperoses" selected={selectedOrder.status === 'Diperoses'}>Diperoses (Sedang Dibuat)</option>
							<option value="Selesai" selected={selectedOrder.status === 'Selesai'}>Selesai (Sudah Dikirim)</option>
						</select>
					</form>
				</div>

				<hr class="border-slate-100" />

				<!-- Form Set Harga -->
				<div class="space-y-3">
					<Label class="text-slate-800 font-bold text-[15px]">Input Total Harga</Label>
					<form method="POST" action="?/updateAmount" use:enhance={() => {
						return async ({ update }) => {
							await update();
							closeDrawer();
						};
					}} class="flex flex-col gap-3">
						<input type="hidden" name="id" value={selectedOrder.id} />
						<div class="relative">
							<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-lg">Rp</span>
							<Input name="amount" type="number" placeholder="0" value={selectedOrder.amount || ''} class="w-full pl-12 h-14 text-lg font-bold text-slate-800 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-slate-800 shadow-inner" />
						</div>
						<Button type="submit" class="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-transform text-[16px] font-bold shadow-lg shadow-slate-900/20">Simpan Harga</Button>
					</form>
				</div>

				<hr class="border-slate-100" />

				<!-- Form Upload Bukti -->
				<div class="space-y-3">
					<Label class="text-slate-800 font-bold text-[15px]">Bukti Pembayaran</Label>
					
					{#if selectedOrder.proof_of_transfer}
						<div class="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
							<span class="text-sm font-semibold text-emerald-800 flex items-center gap-2">
								<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
								Bukti Tersimpan
							</span>
							<a href={selectedOrder.proof_of_transfer} target="_blank" class="text-sm text-emerald-700 hover:text-emerald-900 underline font-bold px-3 py-1.5 bg-emerald-100/50 rounded-lg transition-colors">Lihat Foto</a>
						</div>
					{/if}
					
					<form method="POST" action="?/uploadReceipt" enctype="multipart/form-data" use:enhance={() => {
						uploadingReceipt = true;
						return async ({ update }) => {
							await update();
							closeDrawer();
						};
					}} class="flex flex-col gap-3">
						<input type="hidden" name="id" value={selectedOrder.id} />
						<!-- Touch friendly upload box -->
						<label class="w-full h-28 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group">
							{#if uploadingReceipt}
								<div class="flex flex-col items-center text-slate-500 font-medium animate-pulse">
									<svg class="w-6 h-6 mb-2 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
									Mengunggah...
								</div>
							{:else}
								<div class="flex flex-col items-center gap-2 text-slate-500 font-semibold group-hover:text-slate-700">
									<div class="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-200 group-hover:scale-110 transition-transform">
										<svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
									</div>
									<span>Ambil Foto / Upload Galeri</span>
								</div>
							{/if}
							<!-- Capture limits to camera on mobile if supported, fallback to image picker -->
							<input type="file" name="receipt" accept="image/*" capture="environment" class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full disabled:cursor-not-allowed" disabled={uploadingReceipt} onchange={(e) => {
								if(e.target.files.length > 0) {
									e.target.form.requestSubmit();
								}
							}} />
						</label>
						<p class="text-[12px] text-center text-slate-400 font-medium">Pilih foto dan sistem akan otomatis mengunggah.</p>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}
