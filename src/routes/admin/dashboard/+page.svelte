<script>
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
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
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(Number(amount) || 0);
	}

	const todayStr = new Date().toISOString().split('T')[0];

	let selectedOrder = $state(null);
	let isDrawerOpen = $state(false);
	let uploadingReceipt = $state(false);

	let searchQuery = $state('');
	let statusFilter = $state('All');
	let dateMode = $state('daily');
	let customStart = $state(todayStr);
	let customEnd = $state(todayStr);
	let startDate = $state(todayStr);
	let endDate = $state(todayStr);
	let dateTypeFilter = $state('delivery_date');

	$effect(() => {
		const today = new Date();
		if (dateMode === 'weekly') {
			const weekAgo = new Date(today);
			weekAgo.setDate(today.getDate() - 6);
			startDate = weekAgo.toISOString().split('T')[0];
			endDate = todayStr;
		} else if (dateMode === 'monthly') {
			const monthAgo = new Date(today);
			monthAgo.setDate(today.getDate() - 29);
			startDate = monthAgo.toISOString().split('T')[0];
			endDate = todayStr;
		} else if (dateMode === 'range') {
			startDate = customStart;
			endDate = customEnd;
		} else {
			startDate = todayStr;
			endDate = todayStr;
		}
	});

	let filteredOrders = $derived(data.orders.filter(order => {
		const matchesSearch = !searchQuery ||
			order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			order.order_number?.toString().includes(searchQuery);

		const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
		
		let targetDate = '';
		if (dateTypeFilter === 'created_at') {
			targetDate = order.created_at ? order.created_at.split('T')[0] : '';
		} else {
			targetDate = order.delivery_date || '';
		}
		
		const inRange = targetDate >= startDate && targetDate <= endDate;

		return matchesSearch && matchesStatus && inRange;
	}));

	let pendingOrders = $derived(filteredOrders.filter(order => order.status === 'Pending'));
	let processingOrders = $derived(filteredOrders.filter(order => order.status === 'Diproses'));
	let completedOrders = $derived(filteredOrders.filter(order => order.status === 'Selesai'));
	let totalRevenue = $derived(completedOrders.reduce((acc, order) => acc + Number(order.amount || 0), 0));
	let totalSales = $derived(filteredOrders.length);

	function openDrawer(order) {
		selectedOrder = order;
		isDrawerOpen = true;
	}

	function closeDrawer() {
		isDrawerOpen = false;
		selectedOrder = null;
		uploadingReceipt = false;
	}

	function exportToExcel() {
		const rows = filteredOrders.map((order, i) => ({
			'No': i + 1,
			'No Order': order.order_number,
			'Nama Pelanggan': order.customer_name,
			'No HP': order.phone_number,
			'Produk': order.products?.name ?? '-',
			'Ukuran': order.cake_size ?? '-',
			'Qty': order.quantity,
			'Tanggal Kirim': order.delivery_date ?? '-',
			'Waktu Kirim': order.delivery_time ?? '-',
			'Status': order.status,
			'Total Harga': order.amount ?? 0,
			'Catatan': order.notes ?? '-'
		}));

		const ws = XLSX.utils.json_to_sheet(rows);
		// Set column widths
		ws['!cols'] = [
			{ wch: 4 }, { wch: 10 }, { wch: 22 }, { wch: 16 },
			{ wch: 20 }, { wch: 10 }, { wch: 5 }, { wch: 14 },
			{ wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 28 }
		];
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Laporan Transaksi');

		const label = dateMode === 'range' ? `${startDate}_${endDate}` : dateMode;
		XLSX.writeFile(wb, `Laporan_Transaksi_${label}.xlsx`);
	}
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="space-y-3">
			<div class="text-sm font-semibold uppercase tracking-[0.2em] text-[#8C5A35]">Dashboard Admin</div>
			<h1 class="text-3xl font-bold text-[#4A3B32]">Ringkasan Penjualan</h1>
			<p class="max-w-2xl text-sm text-[#4A3B32]/70">Lihat total omset, total penjualan, dan daftar pesanan belum diproses. Filter default harian, bisa diganti mingguan, bulanan, atau rentang tanggal.</p>
		</div>
		<Button onclick={exportToExcel} variant="outline" class="rounded-full px-5 py-3 text-sm font-semibold border-[#8C5A35]/30 text-[#8C5A35] hover:bg-[#8C5A35]/10 gap-2 shrink-0">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
			Export Excel
		</Button>
	</div>

	{#if form?.error}
		<div class="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
			<strong>Error:</strong> {form.error}
		</div>
	{/if}

	<div class="flex flex-col gap-5">
		<div class="flex flex-col lg:flex-row items-center justify-between gap-3 bg-transparent px-0">
			<!-- Search -->
			<div class="relative w-full lg:flex-1 lg:min-w-[220px]">
				<svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3B32]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
				<Input type="text" placeholder="Cari pesanan..." bind:value={searchQuery} class="pl-11 h-12 w-full rounded-2xl bg-white border border-[#8C5A35]/20 focus:border-[#8C5A35] transition-colors" />
			</div>

			<!-- Filters -->
			<div class="grid grid-cols-2 md:flex items-center gap-2 md:gap-3 w-full lg:w-auto">
				<select bind:value={dateTypeFilter} class="h-12 w-full md:w-auto rounded-2xl bg-white border border-[#8C5A35]/20 px-3 text-sm font-medium text-[#4A3B32] focus:outline-none focus:border-[#8C5A35] focus:ring-2 focus:ring-slate-100">
					<option value="delivery_date">Tgl Kirim</option>
					<option value="created_at">Tgl Order</option>
				</select>
				
				<select bind:value={dateMode} class="h-12 w-full md:w-auto rounded-2xl bg-white border border-[#8C5A35]/20 px-3 text-sm font-medium text-[#4A3B32] focus:outline-none focus:border-[#8C5A35] focus:ring-2 focus:ring-slate-100">
					<option value="daily">Harian</option>
					<option value="weekly">Mingguan</option>
					<option value="monthly">Bulanan</option>
					<option value="range">Range</option>
				</select>
				
				<select bind:value={statusFilter} class="h-12 w-full md:w-auto col-span-2 md:col-span-1 rounded-2xl bg-white border border-[#8C5A35]/20 px-3 text-sm font-medium text-[#4A3B32] focus:outline-none focus:border-[#8C5A35] focus:ring-2 focus:ring-slate-100">
					<option value="All">Semua Status</option>
					<option value="Pending">Pending</option>
					<option value="Diproses">Diproses</option>
					<option value="Selesai">Selesai</option>
					<option value="Batal/Refund">Batal/Refund</option>
				</select>
				
				{#if dateMode === 'range'}
					<div class="flex col-span-2 md:w-auto gap-2">
						<DatePicker bind:value={customStart} class="h-12 rounded-2xl px-3 text-sm font-medium w-full lg:w-[140px] border-[#8C5A35]/20 bg-white" placeholder="Awal" />
						<DatePicker bind:value={customEnd} class="h-12 rounded-2xl px-3 text-sm font-medium w-full lg:w-[140px] border-[#8C5A35]/20 bg-white" placeholder="Akhir" />
					</div>
				{/if}
			</div>

			{#if searchQuery || statusFilter !== 'All' || dateMode !== 'daily' || dateTypeFilter !== 'delivery_date'}
				<Button variant="outline" class="h-12 rounded-2xl px-5 text-sm font-semibold w-full lg:w-auto mt-1 lg:mt-0 border-[#8C5A35]/30 text-[#8C5A35] hover:bg-[#8C5A35]/10" onclick={() => {
					searchQuery = '';
					statusFilter = 'All';
					dateMode = 'daily';
					customStart = todayStr;
					customEnd = todayStr;
					dateTypeFilter = 'delivery_date';
				}}>
					Reset
				</Button>
			{/if}
		</div>
		<div class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-3xl border border-[#8C5A35]/20 bg-slate-50 p-4">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Total Omset (Selesai)</p>
					<p class="mt-3 text-3xl font-bold text-[#4A3B32]">{formatCurrency(totalRevenue)}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Total omset pesanan berstatus selesai.</p>
				</div>

				<div class="rounded-3xl border border-[#8C5A35]/20 bg-slate-50 p-4">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Total Penjualan</p>
					<p class="mt-3 text-3xl font-bold text-[#4A3B32]">{totalSales}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Jumlah order sesuai periode.</p>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-3">
				<div class="rounded-3xl border border-[#8C5A35]/20 bg-slate-50 p-4">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Pending</p>
					<p class="mt-3 text-3xl font-bold text-[#4A3B32]">{pendingOrders.length}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Pesanan belum diproses.</p>
				</div>

				<div class="rounded-3xl border border-[#8C5A35]/20 bg-slate-50 p-4">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Diproses</p>
					<p class="mt-3 text-3xl font-bold text-[#4A3B32]">{processingOrders.length}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Pesanan sedang dibuat.</p>
				</div>

				<div class="rounded-3xl border border-[#8C5A35]/20 bg-slate-50 p-4">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Selesai</p>
					<p class="mt-3 text-3xl font-bold text-[#4A3B32]">{completedOrders.length}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Pesanan sudah dikirim.</p>
				</div>
			</div>
		</div>
	</div>

	<div class="rounded-[2rem] overflow-hidden border border-[#8C5A35]/20 bg-white shadow-sm">
		<div class="flex flex-col gap-4 border-b border-[#8C5A35]/20 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
			<div>
				<p class="text-sm font-semibold text-[#4A3B32]/70 uppercase tracking-widest">Pesanan Belum Diproses</p>
				<h2 class="mt-2 text-2xl font-bold text-[#4A3B32]">Daftar Order Pending</h2>
				<p class="mt-1 text-sm text-[#4A3B32]/70">Menampilkan {pendingOrders.length} pesanan pada rentang tanggal {startDate} sampai {endDate}.</p>
			</div>
			<div class="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-[#4A3B32]/80">Mode: {dateMode === 'range' ? 'Custom Range' : dateMode}</div>
		</div>

		<div class="overflow-x-auto">
			<table class="min-w-full text-left text-sm text-[#4A3B32]">
				<thead class="bg-slate-50 text-[#4A3B32]/70 text-xs uppercase tracking-wide">
					<tr>
						<th class="px-4 py-4">No Order</th>
						<th class="px-4 py-4">Nama</th>
						<th class="px-4 py-4">Produk</th>
						<th class="px-4 py-4">Qty</th>
						<th class="px-4 py-4">Tanggal Kirim</th>
						<th class="px-4 py-4">Total</th>
						<th class="px-4 py-4">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200 bg-white">
					{#each pendingOrders as order}
						<tr class="hover:bg-slate-50 transition-colors">
							<td class="px-4 py-4 font-semibold text-[#4A3B32]">#{order.order_number}</td>
							<td class="px-4 py-4">{order.customer_name}</td>
							<td class="px-4 py-4">
								{#if order.order_items && order.order_items.length > 0}
									{order.order_items[0].products?.name ?? 'Unknown'}
									{#if order.order_items.length > 1}
										<br><span class="text-xs text-[#8C5A35] font-semibold">+{order.order_items.length - 1} produk lainnya</span>
									{/if}
								{:else}
									Data pesanan lama (Legacy)
								{/if}
							</td>
							<td class="px-4 py-4">{order.order_items ? order.order_items.length : order.quantity} item</td>
							<td class="px-4 py-4">{formatDate(order.delivery_date)}</td>
							<td class="px-4 py-4 font-semibold text-[#4A3B32]">{formatCurrency(order.amount)}</td>
							<td class="px-4 py-4">
								<Button variant="outline" size="sm" class="rounded-full px-4 py-2 text-xs font-semibold" onclick={() => openDrawer(order)}>
									Kelola
								</Button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-4 py-8 text-center text-sm text-[#4A3B32]/70">
								Tidak ada pesanan pending pada periode ini.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

{#if isDrawerOpen && selectedOrder}
	<div class="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
		<button class="absolute inset-0 w-full h-full bg-[#8C5A35]/40 backdrop-blur-sm cursor-default" transition:fade={{ duration: 200 }} onclick={closeDrawer} aria-label="Close modal"></button>
		<div class="relative bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-safe-12 w-full max-w-xl mx-auto" transition:fly={{ y: '100%', duration: 350, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}>
			<div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
			<div class="flex justify-between items-start mb-6">
				<div>
					<h3 class="text-xl font-bold text-[#4A3B32] mb-1">Kelola Pesanan</h3>
					<p class="text-sm font-medium text-[#4A3B32]/70">#{selectedOrder.order_number} • {selectedOrder.customer_name}</p>
				</div>
				<button onclick={closeDrawer} aria-label="Close modal" class="p-2 -mr-2 text-[#4A3B32]/50 hover:text-[#4A3B32]/80 bg-slate-50 hover:bg-slate-50 rounded-full transition-colors">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>
			<div class="space-y-6 overflow-y-auto max-h-[70vh] pb-8 px-1">
				<div class="space-y-3">
					<Label class="text-[#4A3B32] font-bold text-[15px]">Status Pesanan</Label>
					<form method="POST" action="?/updateStatus" use:enhance={() => {
						return async ({ update }) => {
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedOrder.id} />
						<select name="status" class="w-full text-[15px] font-bold rounded-xl border-2 px-4 py-4 focus:outline-none focus:ring-2 focus:ring-[#8C5A35] transition-colors cursor-pointer shadow-sm {selectedOrder.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : selectedOrder.status === 'Diproses' ? 'bg-blue-50 text-blue-700 border-blue-200' : selectedOrder.status === 'Batal/Refund' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-[#4A3B32] border-[#8C5A35]/20'}" onchange={(e) => e.target.form.requestSubmit()}>
							<option value="Pending" selected={selectedOrder.status === 'Pending'}>Pending (Belum Diproses)</option>
							<option value="Diproses" selected={selectedOrder.status === 'Diproses'}>Diproses (Sedang Dibuat)</option>
							<option value="Selesai" selected={selectedOrder.status === 'Selesai'}>Selesai (Sudah Dikirim)</option>
							<option value="Batal/Refund" selected={selectedOrder.status === 'Batal/Refund'}>Batal / Refund</option>
						</select>
					</form>
				</div>
				<hr class="border-[#8C5A35]/10" />
				<div class="space-y-3">
					<Label class="text-[#4A3B32] font-bold text-[15px]">Input Total Harga</Label>
					<form method="POST" action="?/updateAmount" use:enhance={() => {
						return async ({ update }) => {
							await update();
							closeDrawer();
						};
					}} class="flex flex-col gap-3">
						<input type="hidden" name="id" value={selectedOrder.id} />
						<div class="relative">
							<PriceInput name="amount" placeholder="0" value={selectedOrder.amount || ''} class="w-full h-14 text-lg font-bold text-[#4A3B32] rounded-xl bg-slate-50 border-[#8C5A35]/20 focus-visible:ring-slate-800 shadow-inner" />
						</div>
						<Button type="submit" class="w-full h-14 rounded-xl bg-[#8C5A35] hover:bg-[#724828] active:scale-[0.98] transition-transform text-[16px] font-bold shadow-lg shadow-slate-900/20">Simpan Harga</Button>
					</form>
				</div>
				<hr class="border-[#8C5A35]/10" />
				<div class="space-y-3">
					<Label class="text-[#4A3B32] font-bold text-[15px]">Bukti Pembayaran</Label>
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
						return async ({ update }) => {
							await update();
						};
					}} class="space-y-3">
						<input type="hidden" name="id" value={selectedOrder.id} />
						<input type="file" name="receipt" accept="image/*" class="w-full rounded-2xl border border-[#8C5A35]/20 bg-slate-50 px-4 py-3 text-sm text-[#4A3B32]/80 file:rounded-xl file:border file:border-[#8C5A35]/30 file:bg-white file:px-4 file:py-2" />
						<Button type="submit" class="w-full h-14 rounded-xl bg-[#8C5A35] hover:bg-[#724828] text-white font-bold">Unggah Bukti</Button>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}
