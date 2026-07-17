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

<div class="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0 space-y-2">
			<div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:text-sm sm:tracking-[0.2em]">Dashboard Admin</div>
			<h1 class="text-2xl font-bold leading-tight text-[#4A3B32] sm:text-3xl">Ringkasan Penjualan</h1>
			<p class="max-w-2xl text-sm leading-relaxed text-[#4A3B32]/70">Lihat total omset, total penjualan, dan daftar pesanan belum diproses. Filter default harian, bisa diganti mingguan, bulanan, atau rentang tanggal.</p>
		</div>
		<Button onclick={exportToExcel} variant="outline" class="h-11 w-full rounded-xl border-primary/30 px-4 text-sm font-semibold text-primary hover:bg-primary/10 active:scale-[0.98] sm:w-auto sm:rounded-full sm:px-5 gap-2">
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
		<div class="rounded-2xl border border-primary/10 bg-white p-3 shadow-sm sm:p-4">
			<div class="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-start">
			<!-- Search -->
			<div class="relative w-full">
				<svg class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3B32]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
				<Input type="text" placeholder="Cari pesanan..." bind:value={searchQuery} class="pl-11 h-12 w-full rounded-2xl bg-white border border-primary/20 focus:border-primary transition-colors" />
			</div>

			<!-- Filters -->
			<div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-[120px_120px_160px_auto]">
				<select bind:value={dateTypeFilter} class="h-12 w-full md:w-auto rounded-2xl bg-white border border-primary/20 px-3 text-sm font-medium text-[#4A3B32] focus:outline-none focus:border-primary focus:ring-2 focus:ring-slate-100">
					<option value="delivery_date">Tgl Kirim</option>
					<option value="created_at">Tgl Order</option>
				</select>
				
				<select bind:value={dateMode} class="h-12 w-full md:w-auto rounded-2xl bg-white border border-primary/20 px-3 text-sm font-medium text-[#4A3B32] focus:outline-none focus:border-primary focus:ring-2 focus:ring-slate-100">
					<option value="daily">Harian</option>
					<option value="weekly">Mingguan</option>
					<option value="monthly">Bulanan</option>
					<option value="range">Range</option>
				</select>
				
				<select bind:value={statusFilter} class="col-span-2 h-12 w-full rounded-2xl bg-white border border-primary/20 px-3 text-sm font-medium text-[#4A3B32] focus:outline-none focus:border-primary focus:ring-2 focus:ring-slate-100 sm:col-span-1">
					<option value="All">Semua Status</option>
					<option value="Pending">Pending</option>
					<option value="Diproses">Diproses</option>
					<option value="Selesai">Selesai</option>
					<option value="Batal/Refund">Batal/Refund</option>
				</select>
				
				{#if dateMode === 'range'}
					<div class="col-span-2 grid gap-2 sm:col-span-4 sm:grid-cols-2 lg:col-span-4">
						<DatePicker bind:value={customStart} class="h-12 min-w-0 rounded-2xl px-3 text-sm font-medium border-primary/20 bg-white" placeholder="Awal" />
						<DatePicker bind:value={customEnd} class="h-12 min-w-0 rounded-2xl px-3 text-sm font-medium border-primary/20 bg-white" placeholder="Akhir" />
					</div>
				{/if}

			{#if searchQuery || statusFilter !== 'All' || dateMode !== 'daily' || dateTypeFilter !== 'delivery_date'}
				<Button variant="outline" class="col-span-2 h-12 rounded-2xl px-5 text-sm font-semibold w-full border-primary/30 text-primary hover:bg-primary/10 sm:col-span-4 lg:col-span-4" onclick={() => {
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
			</div>
		</div>
		<div class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Total Omset (Selesai)</p>
					<p class="mt-2 break-words text-2xl font-bold leading-tight text-[#4A3B32] sm:text-3xl">{formatCurrency(totalRevenue)}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Total omset pesanan berstatus selesai.</p>
				</div>

				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Total Penjualan</p>
					<p class="mt-2 text-2xl font-bold leading-tight text-[#4A3B32] sm:text-3xl">{totalSales}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Jumlah order sesuai periode.</p>
				</div>
			</div>

			<div class="grid gap-3 sm:grid-cols-3 sm:gap-4">
				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Pending</p>
					<p class="mt-2 text-2xl font-bold text-[#4A3B32] sm:text-3xl">{pendingOrders.length}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Pesanan belum diproses.</p>
				</div>

				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Diproses</p>
					<p class="mt-2 text-2xl font-bold text-[#4A3B32] sm:text-3xl">{processingOrders.length}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Pesanan sedang dibuat.</p>
				</div>

				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm">
					<p class="text-sm font-semibold text-[#4A3B32]/70">Selesai</p>
					<p class="mt-2 text-2xl font-bold text-[#4A3B32] sm:text-3xl">{completedOrders.length}</p>
					<p class="mt-2 text-sm text-[#4A3B32]/70">Pesanan sudah dikirim.</p>
				</div>
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm sm:rounded-[1.5rem]">
		<div class="flex flex-col gap-3 border-b border-primary/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
			<div class="min-w-0">
				<p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4A3B32]/70 sm:text-sm sm:tracking-widest">Pesanan Belum Diproses</p>
				<h2 class="mt-1 text-xl font-bold leading-tight text-[#4A3B32] sm:mt-2 sm:text-2xl">Daftar Order Pending</h2>
				<p class="mt-1 text-sm leading-relaxed text-[#4A3B32]/70">Menampilkan {pendingOrders.length} pesanan pada rentang tanggal {startDate} sampai {endDate}.</p>
			</div>
			<div class="w-fit rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-[#4A3B32]/80 sm:px-4 sm:py-3 sm:text-sm">Mode: {dateMode === 'range' ? 'Custom Range' : dateMode}</div>
		</div>

		<div class="grid gap-3 p-3 md:hidden">
			{#each pendingOrders as order}
				<article class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="text-xs font-semibold uppercase tracking-wide text-primary">#{order.order_number}</p>
							<h3 class="mt-1 truncate text-base font-bold text-[#4A3B32]">{order.customer_name}</h3>
						</div>
						<p class="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Pending</p>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50">Produk</p>
							<p class="mt-1 line-clamp-2 font-medium text-[#4A3B32]">
								{#if order.order_items && order.order_items.length > 0}
									{order.order_items[0].products?.name ?? 'Unknown'}
									{#if order.order_items.length > 1}
										<span class="text-primary">+{order.order_items.length - 1} lainnya</span>
									{/if}
								{:else}
									Data lama
								{/if}
							</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50">Tanggal Kirim</p>
							<p class="mt-1 font-medium text-[#4A3B32]">{formatDate(order.delivery_date)}</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50">Qty</p>
							<p class="mt-1 font-medium text-[#4A3B32]">{order.order_items ? order.order_items.length : order.quantity} item</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50">Total</p>
							<p class="mt-1 font-bold text-[#4A3B32]">{formatCurrency(order.amount)}</p>
						</div>
					</div>
					<Button variant="outline" size="sm" class="mt-4 h-10 w-full rounded-xl text-sm font-semibold active:scale-[0.98]" onclick={() => openDrawer(order)}>
						Kelola
					</Button>
				</article>
			{:else}
				<div class="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-[#4A3B32]/70">
					Tidak ada pesanan pending pada periode ini.
				</div>
			{/each}
		</div>

		<div class="hidden overflow-x-auto md:block">
			<table class="min-w-205 w-full text-left text-sm text-[#4A3B32]">
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
										<br><span class="text-xs text-primary font-semibold">+{order.order_items.length - 1} produk lainnya</span>
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
		<button class="absolute inset-0 w-full h-full bg-primary/40 backdrop-blur-sm cursor-default" transition:fade={{ duration: 200 }} onclick={closeDrawer} aria-label="Close modal"></button>
		<div class="relative mx-auto flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl bg-white p-4 pb-safe-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] sm:p-6 sm:pb-safe-12" transition:fly={{ y: '100%', duration: 280, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}>
			<div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-5 sm:mb-6"></div>
			<div class="mb-5 flex min-w-0 items-start justify-between gap-3 sm:mb-6">
				<div class="min-w-0">
					<h3 class="text-lg font-bold text-[#4A3B32] mb-1 sm:text-xl">Kelola Pesanan</h3>
					<p class="truncate text-sm font-medium text-[#4A3B32]/70">#{selectedOrder.order_number} • {selectedOrder.customer_name}</p>
				</div>
				<button onclick={closeDrawer} aria-label="Close modal" class="shrink-0 p-2 -mr-2 text-[#4A3B32]/50 hover:text-[#4A3B32]/80 bg-slate-50 hover:bg-slate-50 rounded-full transition-colors active:scale-[0.96]">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>
			<div class="min-h-0 flex-1 space-y-5 overflow-y-auto pb-6 px-1 sm:space-y-6 sm:pb-8">
				<div class="space-y-3">
					<Label class="text-[#4A3B32] font-bold text-[15px]">Status Pesanan</Label>
					<form method="POST" action="?/updateStatus" use:enhance={() => {
						return async ({ update }) => {
							await update();
						};
					}}>
						<input type="hidden" name="id" value={selectedOrder.id} />
						<select name="status" class="w-full text-[15px] font-bold rounded-xl border-2 px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary transition-colors cursor-pointer shadow-sm {selectedOrder.status === 'Selesai' ? 'bg-green-50 text-green-700 border-green-200' : selectedOrder.status === 'Diproses' ? 'bg-blue-50 text-blue-700 border-blue-200' : selectedOrder.status === 'Batal/Refund' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-[#4A3B32] border-primary/20'}" onchange={(e) => e.target.form.requestSubmit()}>
							<option value="Pending" selected={selectedOrder.status === 'Pending'}>Pending (Belum Diproses)</option>
							<option value="Diproses" selected={selectedOrder.status === 'Diproses'}>Diproses (Sedang Dibuat)</option>
							<option value="Selesai" selected={selectedOrder.status === 'Selesai'}>Selesai (Sudah Dikirim)</option>
							<option value="Batal/Refund" selected={selectedOrder.status === 'Batal/Refund'}>Batal / Refund</option>
						</select>
					</form>
				</div>
				<hr class="border-primary/10" />
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
							<PriceInput name="amount" placeholder="0" value={selectedOrder.amount || ''} class="w-full h-14 text-lg font-bold text-[#4A3B32] rounded-xl bg-slate-50 border-primary/20 focus-visible:ring-slate-800 shadow-inner" />
						</div>
						<Button type="submit" class="w-full h-14 rounded-xl bg-primary hover:bg-[#724828] active:scale-[0.98] transition-transform text-[16px] font-bold shadow-lg shadow-slate-900/20">Simpan Harga</Button>
					</form>
				</div>
				<hr class="border-primary/10" />
				<div class="space-y-3">
					<Label class="text-[#4A3B32] font-bold text-[15px]">Bukti Pembayaran</Label>
					{#if selectedOrder.proof_of_transfer}
						<div class="flex flex-col gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl sm:flex-row sm:items-center sm:justify-between">
							<span class="text-sm font-semibold text-emerald-800 flex items-center gap-2">
								<svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
								Bukti Tersimpan
							</span>
							<a href={selectedOrder.proof_of_transfer} target="_blank" class="w-fit text-sm text-emerald-700 hover:text-emerald-900 underline font-bold px-3 py-1.5 bg-emerald-100/50 rounded-lg transition-colors">Lihat Foto</a>
						</div>
					{/if}
					<form method="POST" action="?/uploadReceipt" enctype="multipart/form-data" use:enhance={() => {
						return async ({ update }) => {
							await update();
						};
					}} class="space-y-3">
						<input type="hidden" name="id" value={selectedOrder.id} />
						<input type="file" name="receipt" accept="image/*" class="w-full rounded-2xl border border-primary/20 bg-slate-50 px-4 py-3 text-sm text-[#4A3B32]/80 file:rounded-xl file:border file:border-primary/30 file:bg-white file:px-4 file:py-2" />
						<Button type="submit" class="w-full h-14 rounded-xl bg-primary hover:bg-[#724828] text-white font-bold">Unggah Bukti</Button>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}
