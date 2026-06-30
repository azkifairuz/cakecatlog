<script>
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import { Label } from '$lib/components/ui/label';
	import { fly, fade } from 'svelte/transition';
	import * as XLSX from 'xlsx';
	
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
	let sendingInvoice = $state(false);
	let invoiceStatus = $state(null); // { success: bool, message: string }

	// Harga State
	let draftCakePrice = $state(0);
	let draftDeliveryFee = $state(0);
	let draftDeliveryVehicle = $state('Bike');
	let calculatedTotal = $derived(Number(draftCakePrice || 0) + Number(draftDeliveryFee || 0));

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
		draftCakePrice = order.cake_price || order.amount || 0;
		draftDeliveryFee = order.delivery_fee || 0;
		draftDeliveryVehicle = order.delivery_vehicle || 'Bike';
		isDrawerOpen = true;
	}

	function closeDrawer() {
		isDrawerOpen = false;
		selectedOrder = null;
		uploadingReceipt = false;
		sendingInvoice = false;
		invoiceStatus = null;
	}

	async function sendInvoice(orderId) {
		sendingInvoice = true;
		invoiceStatus = null;
		try {
			const res = await fetch('/api/send-invoice', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId })
			});
			const data = await res.json();
			invoiceStatus = data;
		} catch (err) {
			invoiceStatus = { success: false, message: 'Gagal menghubungi server.' };
		}
		sendingInvoice = false;
	}

	function exportToExcel() {
		const rows = filteredOrders.map((order, i) => ({
			'No': i + 1,
			'No Order': order.order_number,
			'Nama Pelanggan': order.customer_name,
			'No HP': order.phone_number,
			'Produk': order.products?.name ?? '-',
			'Ukuran': order.cake_size ?? '-',
			'Warna': order.cake_color ?? '-',
			'Rasa': order.cake_flavor ?? '-',
			'Mahkota': order.crown_option ?? '-',
			'Glitter': order.add_edible_glitter ?? '-',
			'Qty': order.quantity,
			'Tanggal Kirim': order.delivery_date ?? '-',
			'Waktu Kirim': order.delivery_time ?? '-',
			'Status': order.status,
			'Total Harga': order.amount ?? 0,
			'Catatan': order.notes ?? '-'
		}));

		const ws = XLSX.utils.json_to_sheet(rows);
		ws['!cols'] = [
			{ wch: 4 }, { wch: 10 }, { wch: 22 }, { wch: 16 },
			{ wch: 20 }, { wch: 10 }, { wch: 5 }, { wch: 14 },
			{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 28 }
		];
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Daftar Pesanan');

		const filterLabel = dateFilter || 'semua';
		XLSX.writeFile(wb, `Daftar_Pesanan_${filterLabel}.xlsx`);
	}
</script>

<div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
	<h1 class="text-2xl font-bold text-slate-800">Daftar Pesanan</h1>
	<Button onclick={exportToExcel} variant="outline" class="rounded-full px-5 py-2.5 text-sm font-semibold border-[#8C5A35]/30 text-[#8C5A35] hover:bg-[#8C5A35]/10 gap-2 shrink-0">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
		Export Excel
	</Button>
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
				<option value="Diproses">Diproses</option>
				<option value="Selesai">Selesai</option>
				<option value="Batal/Refund">Batal / Refund</option>
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

<div class="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 pb-4">
	{#each filteredOrders as order (order.id)}
		<Card.Root class="shadow-sm border-slate-200 hover:shadow-md transition-shadow overflow-visible">
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
							 order.status === 'Diproses' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
							 order.status === 'Batal/Refund' ? 'bg-red-50 text-red-700 border-red-200' : 
							 'bg-slate-50 text-slate-700 border-slate-200'}" 
							onchange={(e) => e.target.form.requestSubmit()}>
							<option value="Pending" selected={order.status === 'Pending'}>Pending</option>
							<option value="Diproses" selected={order.status === 'Diproses'}>Diproses</option>
							<option value="Selesai" selected={order.status === 'Selesai'}>Selesai</option>
							<option value="Batal/Refund" selected={order.status === 'Batal/Refund'}>Batal / Refund</option>
						</select>
					</form>
				</div>
				
				<!-- Detail Produk -->
				<div class="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex flex-col gap-2 text-sm text-slate-600">
					{#if order.order_items && order.order_items.length > 0}
						<p class="flex justify-between items-start gap-2">
							<span class="font-bold text-slate-700 leading-tight break-words flex-1">
								{order.order_items[0].products?.name ?? 'Unknown'}
								{#if order.order_items.length > 1}
									<span class="text-xs text-slate-500 font-normal block mt-0.5">+ {order.order_items.length - 1} produk lainnya</span>
								{/if}
							</span>
							<span class="font-medium text-[12px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600 shrink-0">
								{order.order_items.length} item
							</span>
						</p>
					{:else}
						<p class="font-bold text-slate-700 leading-tight">Data pesanan lama (Legacy)</p>
					{/if}
					
					<div class="flex justify-end items-center text-[12px] sm:text-[13px] mt-1">
						<span class="flex items-center gap-1 text-slate-500 text-right">
							<svg class="w-3.5 h-3.5 shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
							{formatDate(order.delivery_date)} &bull; {order.delivery_time}
						</span>
					</div>
				</div>

				<!-- Footer Card: Harga & Action -->
				<div class="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-1 ">
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
				<button onclick={closeDrawer} aria-label="Close modal" class="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>

			<div class="space-y-6 overflow-y-auto max-h-[70vh] pb-8 px-1">
				
				<!-- Daftar Item -->
				{#if selectedOrder.order_items && selectedOrder.order_items.length > 0}
					<div class="space-y-3">
						<Label class="text-slate-800 font-bold text-[15px]">Daftar Item Pesanan</Label>
						<div class="space-y-3 max-h-60 overflow-y-auto pr-1">
							{#each selectedOrder.order_items as item}
								<div class="p-3 bg-slate-50 border border-slate-100 rounded-xl">
									<h4 class="font-bold text-slate-800 text-sm mb-1">{item.products?.name ?? 'Unknown'}</h4>
									<div class="grid grid-cols-2 gap-y-1 gap-x-2 text-xs text-slate-600">
										<p><span class="text-slate-400">Qty:</span> {item.quantity}</p>
										<p><span class="text-slate-400">Size:</span> {item.cake_size}</p>
										{#if item.cake_flavor}<p><span class="text-slate-400">Rasa:</span> {item.cake_flavor}</p>{/if}
										{#if item.cake_color}<p><span class="text-slate-400">Warna:</span> {item.cake_color}</p>{/if}
										{#if item.cake_text}<p class="col-span-2"><span class="text-slate-400">Tulisan Kue:</span> {item.cake_text}</p>{/if}
										{#if item.gift_card_text}<p class="col-span-2"><span class="text-slate-400">Kartu Ucapan:</span> {item.gift_card_text}</p>{/if}
									</div>
									{#if item.reference_image_url}
										<div class="mt-2 pt-2 border-t border-slate-200">
											<a href={item.reference_image_url} target="_blank" class="text-xs text-[#8C5A35] font-semibold hover:underline flex items-center gap-1">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
												Lihat Gambar Referensi
											</a>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
					<hr class="border-slate-100" />
				{/if}

				<!-- Form Update Status -->
				<div class="space-y-3">
					<Label class="text-slate-800 font-bold text-[15px]">Status Pesanan</Label>
					<form method="POST" action="?/updateStatus" use:enhance={() => {
						return async ({ update }) => {
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedOrder.id} />
						<select name="status" class="w-full px-4 h-12 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-slate-800 transition-colors cursor-pointer">
							<option value="Pending" selected={selectedOrder.status === 'Pending'}>Pending (Belum Diproses)</option>
							<option value="Diproses" selected={selectedOrder.status === 'Diproses'}>Diproses (Sedang Dibuat)</option>
							<option value="Selesai" selected={selectedOrder.status === 'Selesai'}>Selesai (Sudah Dikirim)</option>
							<option value="Batal/Refund" selected={selectedOrder.status === 'Batal/Refund'}>Batal / Refund</option>
						</select>
					</form>
				</div>

				<hr class="border-slate-100" />

				<!-- Form Set Harga -->
				<div class="space-y-4">
					<Label class="text-slate-800 font-bold text-[15px]">Kelola Harga & Pengiriman</Label>
					<form method="POST" action="?/updateAmount" use:enhance={() => {
						return async ({ update }) => {
							await update();
							closeDrawer();
						};
					}} class="flex flex-col gap-4">
						<input type="hidden" name="id" value={selectedOrder.id} />
						
						<div class="space-y-1.5">
							<Label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Harga Total Kue</Label>
							<PriceInput name="cake_price" placeholder="0" bind:value={draftCakePrice} class="w-full h-12 text-sm font-bold text-slate-800 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-slate-800 shadow-inner" />
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-1.5">
								<Label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Biaya Ongkir</Label>
								<PriceInput name="delivery_fee" placeholder="0" bind:value={draftDeliveryFee} class="w-full h-12 text-sm font-bold text-slate-800 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-slate-800 shadow-inner" />
							</div>
							<div class="space-y-1.5">
								<Label class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Kendaraan</Label>
								<select name="delivery_vehicle" bind:value={draftDeliveryVehicle} class="w-full h-12 px-3 text-sm font-bold text-slate-800 rounded-xl bg-slate-50 border border-slate-200 focus-visible:ring-slate-800 shadow-inner">
									<option value="Bike">Motor (Bike)</option>
									<option value="Car">Mobil (Car)</option>
								</select>
							</div>
						</div>

						<div class="bg-amber-50 p-4 rounded-xl border border-amber-100 mt-2 flex justify-between items-center">
							<span class="text-sm font-bold text-amber-900 uppercase tracking-wider">Total Tagihan</span>
							<span class="text-xl font-black text-amber-600">{formatCurrency(calculatedTotal)}</span>
							<input type="hidden" name="amount" value={calculatedTotal} />
						</div>

						<Button type="submit" class="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-transform text-[16px] font-bold shadow-lg shadow-slate-900/20 mt-2">Simpan Tagihan</Button>
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

				<hr class="border-slate-100" />

				<!-- Kirim Invoice via WhatsApp -->
				<div class="space-y-3">
					<Label class="text-slate-800 font-bold text-[15px]">Kirim Invoice via WhatsApp</Label>
					<p class="text-xs text-slate-500">Kirim detail pesanan dan total harga ke nomor WhatsApp pelanggan ({selectedOrder.phone_number}).</p>
					
					{#if invoiceStatus}
						<div class="p-3 rounded-xl text-sm font-medium {invoiceStatus.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}">
							{invoiceStatus.success ? '✅' : '❌'} {invoiceStatus.message}
						</div>
					{/if}

					<Button 
						onclick={() => sendInvoice(selectedOrder.id)} 
						disabled={sendingInvoice}
						class="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-transform text-[15px] font-bold shadow-lg shadow-green-600/20 gap-2"
					>
						{#if sendingInvoice}
							<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
							Mengirim...
						{:else}
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
							Kirim Invoice ke WhatsApp
						{/if}
					</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
