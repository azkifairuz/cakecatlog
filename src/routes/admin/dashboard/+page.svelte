<script>
	import OrderStatusSelect from '$lib/components/admin/OrderStatusSelect.svelte';
	import DeliveryProofDialog from '$lib/components/admin/DeliveryProofDialog.svelte';
	import DeliveryProofGallery from '$lib/components/admin/DeliveryProofGallery.svelte';
	import { ORDER_STATUS_OPTIONS, orderStatusLabel, DELIVERY_PROOF_FIELDS } from '$lib/order-delivery-proof.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';
	import { Label } from '$lib/components/ui/label';
	import { fly, fade } from 'svelte/transition';
	import { cn } from '$lib/utils';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminSearchField from '$lib/components/admin/AdminSearchField.svelte';
	import OrderScheduleDrawer from '$lib/components/admin/OrderScheduleDrawer.svelte';
	import RevenueAnalyticsChart from '$lib/components/admin/RevenueAnalyticsChart.svelte';
	import TopProductsCard from '$lib/components/admin/TopProductsCard.svelte';
	import OrderStatusBreakdownCard from '$lib/components/admin/OrderStatusBreakdownCard.svelte';
	import RepeatCustomersCard from '$lib/components/admin/RepeatCustomersCard.svelte';
	import Truck from '@lucide/svelte/icons/truck';
	import Store from '@lucide/svelte/icons/store';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { getDashboardDateRange } from '$lib/admin-order-dates.js';
	import { onDestroy, untrack } from 'svelte';

	let { data, form } = $props();

	let scheduleOrder = $state(null);
	let isScheduleDrawerOpen = $state(false);

	function openScheduleDrawer(order, event) {
		if (event) event.stopPropagation();
		scheduleOrder = order;
		isScheduleDrawerOpen = true;
	}

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

	function getStatusBadge(status) {
		const s = String(status || '').toLowerCase();
		if (s === 'completed') {
			return { label: 'Selesai', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' };
		}
		if (s === 'processing') {
			return { label: 'Diproses', class: 'bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800' };
		}
		if (s === 'pending') {
			return { label: 'Pending', class: 'bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' };
		}
		if (s === 'delivered' || s === 'ready' || s === 'paid' || s === 'confirmed') return { label: orderStatusLabel(status), class: 'bg-sky-50 text-sky-700 border border-sky-200/80' };
		return { label: 'Batal/Refund', class: 'bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' };
	}

	let selectedOrder = $state(null);
	let proofOrder = $state(null);
	let proofTargetStatus = $state(null);
	let proofDialogOpen = $state(false);
	function openDeliveryProof(order, status = null) {
		proofOrder = order;
		proofTargetStatus = status;
		proofDialogOpen = true;
	}
	function onProofOrderUpdated(order) {
		if (!order) return;
		const updates = { status: order.status };
		for (const field of DELIVERY_PROOF_FIELDS) {
			updates[field.url] = order[field.url] || order[field.alias] || null;
			updates[field.alias] = updates[field.url];
		}
		if (selectedOrder?.id === order.id) selectedOrder = { ...selectedOrder, ...updates };
		if (proofOrder?.id === order.id) proofOrder = { ...proofOrder, ...updates };
	}

	let isDrawerOpen = $state(false);
	let uploadingReceipt = $state(false);

	let searchQuery = $state(untrack(() => data.filters.q));
	let statusFilter = $state(untrack(() => data.filters.status));
	let groupBy = $state(untrack(() => data.groupBy || 'day'));
	let dateMode = $state('all');
	let customStart = $state(untrack(() => data.filters.start));
	let customEnd = $state(untrack(() => data.filters.end));
	let startDate = $state(untrack(() => data.filters.start));
	let endDate = $state(untrack(() => data.filters.end));
	let dateTypeFilter = $state(untrack(() => data.filters.dateType));
	let searchTimer;

	let pendingOrders = $derived(data.pendingOrders || data.orders || []);
	let recentOrders = $derived(data.recentOrders || []);
	let topProducts = $derived(data.topProducts || []);
	let statusBreakdown = $derived(data.statusBreakdown || []);
	let repeatCustomersData = $derived(data.repeatCustomersData || { repeatCustomers: 0, repeatOrders: 0, repeatOrderRate: 0, totalOrders: 0, customers: [] });
	let totalRevenue = $derived(data.summary.totalRevenue);
	let totalSales = $derived(data.summary.totalSales);
	let exportHref = $derived(`/admin/dashboard/orders/export?scope=dashboard&${page.url.searchParams.toString()}`);

	let filteredPendingOrders = $derived(
		pendingOrders.filter((order) => {
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			const orderNum = String(order.order_number || order.orderNumber || '');
			const custName = String(order.customer_name || order.customerName || '').toLowerCase();
			const phone = String(order.phone_number || order.phoneNumber || '');
			return orderNum.includes(q) || custName.includes(q) || phone.includes(q);
		})
	);

	let filteredRecentOrders = $derived(
		recentOrders.filter((order) => {
			if (!searchQuery) return true;
			const q = searchQuery.toLowerCase();
			const orderNum = String(order.order_number || order.orderNumber || '');
			const custName = String(order.customer_name || order.customerName || '').toLowerCase();
			const phone = String(order.phone_number || order.phoneNumber || '');
			return orderNum.includes(q) || custName.includes(q) || phone.includes(q);
		})
	);

	let displayPendingOrders = $derived(filteredPendingOrders.slice(0, 5));
	let displayRecentOrders = $derived(filteredRecentOrders.slice(0, 5));

	let pendingShowAllHref = $derived(
		`/admin/dashboard/orders?status=Pending${startDate ? `&start=${startDate}` : ''}${endDate ? `&end=${endDate}` : ''}${dateTypeFilter !== 'delivery_date' ? `&date_type=${dateTypeFilter}` : ''}`
	);

	let recentShowAllHref = $derived(
		`/admin/dashboard/orders?status=All${startDate ? `&start=${startDate}` : ''}${endDate ? `&end=${endDate}` : ''}${dateTypeFilter !== 'delivery_date' ? `&date_type=${dateTypeFilter}` : ''}`
	);

	function inferDateMode(start, end, today) {
		if (!start && !end) return 'all';
		if (start === today && end === today) return 'daily';
		const weekly = getDashboardDateRange('weekly', today);
		const monthly = getDashboardDateRange('monthly', today);
		if (start === weekly.start && end === weekly.end) return 'weekly';
		if (start === monthly.start && end === monthly.end) return 'monthly';
		return 'range';
	}

	$effect(() => {
		searchQuery = data.filters.q;
		statusFilter = data.filters.status;
		groupBy = data.groupBy || 'day';
		customStart = data.filters.start;
		customEnd = data.filters.end;
		startDate = data.filters.start;
		endDate = data.filters.end;
		dateTypeFilter = data.filters.dateType;
		dateMode = inferDateMode(data.filters.start, data.filters.end, data.filters.today);
	});

	function getFilterHref(overrides = {}) {
		const values = {
			q: searchQuery,
			status: statusFilter,
			date_type: dateTypeFilter,
			start: startDate,
			end: endDate,
			groupBy: groupBy,
			page: 1,
			...overrides
		};
		const params = new URLSearchParams();
		if (values.q) params.set('q', values.q);
		if (values.status && values.status !== 'All') params.set('status', values.status);
		if (values.date_type && values.date_type !== 'delivery_date') params.set('date_type', values.date_type);
		if (values.start) params.set('start', values.start);
		if (values.end) params.set('end', values.end);
		if (values.groupBy && values.groupBy !== 'day') params.set('groupBy', values.groupBy);
		if (Number(values.page) > 1) params.set('page', String(values.page));
		const query = params.toString();
		return `${page.url.pathname}${query ? `?${query}` : ''}`;
	}

	function navigateFilters(overrides = {}) {
		return goto(getFilterHref(overrides), { replaceState: true, keepFocus: true, noScroll: true });
	}

	function queueSearch(value) {
		searchQuery = value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => navigateFilters({ q: value }), 300);
	}

	function changeDateMode(mode) {
		const range = getDashboardDateRange(mode, data.filters.today, customStart, customEnd);
		dateMode = mode;
		startDate = range.start;
		endDate = range.end;
		navigateFilters(range);
	}

	function changeCustomRange(start, end) {
		startDate = start;
		endDate = end;
		navigateFilters({ start, end });
	}

	function handleGroupByChange(newGroupBy) {
		groupBy = newGroupBy;
		navigateFilters({ groupBy: newGroupBy });
	}

	function resetFilters() {
		searchQuery = '';
		statusFilter = 'All';
		groupBy = 'day';
		dateMode = 'all';
		customStart = '';
		customEnd = '';
		startDate = '';
		endDate = '';
		dateTypeFilter = 'delivery_date';
		navigateFilters({ q: '', status: 'All', groupBy: 'day', start: '', end: '', date_type: 'delivery_date' });
	}

	onDestroy(() => clearTimeout(searchTimer));

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

<AdminPage>
	<AdminPageHeader eyebrow="Dashboard Admin" title="Ringkasan Penjualan" description="Pantau omzet, penjualan, dan pesanan yang perlu segera diproses.">
		{#snippet actions()}
		<Button href={exportHref} variant="outline">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
			Export Excel
		</Button>
		{/snippet}
	</AdminPageHeader>

	{#if form?.error}
		<div class="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
			<strong>Error:</strong> {form.error}
		</div>
	{/if}

	<div class="flex flex-col gap-5">
		<div class="rounded-2xl border border-primary/10 bg-white p-3 shadow-sm sm:p-4">
			<div class="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-start">
			<!-- Search -->
			<div class="w-full">
				<AdminSearchField bind:value={searchQuery} onValueChange={queueSearch} placeholder="Cari pesanan..." label="Cari pesanan" />
			</div>

			<!-- Filters -->
			<div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-[120px_140px_160px_auto]">
				<select bind:value={dateTypeFilter} onchange={(event) => navigateFilters({ date_type: event.currentTarget.value })} class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:w-auto">
					<option value="delivery_date">Tgl Kirim</option>
					<option value="created_at">Tgl Order</option>
				</select>
				
				<select bind:value={dateMode} onchange={(event) => changeDateMode(event.currentTarget.value)} class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:w-auto">
					<option value="all">Semua Waktu</option>
					<option value="monthly">Bulanan (30 Hari)</option>
					<option value="weekly">Mingguan (7 Hari)</option>
					<option value="daily">Harian (Hari Ini)</option>
					<option value="range">Pilih Tanggal (Range)</option>
				</select>
				
				<select bind:value={statusFilter} onchange={(event) => navigateFilters({ status: event.currentTarget.value })} class="col-span-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:col-span-1">
					<option value="All">Semua Status</option>
					{#each ORDER_STATUS_OPTIONS as option}
					<option value={option.value}>{option.label}</option>
				{/each}
				</select>
				
				{#if dateMode === 'range'}
					<div class="col-span-2 sm:col-span-4 lg:col-span-4">
						<DateRangePicker 
							bind:startValue={customStart} 
							bind:endValue={customEnd} 
							onValueChange={({start, end}) => changeCustomRange(start, end)} 
							class="h-10 w-full rounded-lg" 
						/>
					</div>
				{/if}

			{#if searchQuery || statusFilter !== 'All' || dateMode !== 'all' || (dateTypeFilter !== 'delivery_date' && (startDate || endDate))}
				<Button variant="outline" class="col-span-2 h-10 w-full sm:col-span-4 lg:col-span-4" onclick={resetFilters}>
					Reset
				</Button>
			{/if}
			</div>
			</div>
		</div>

		<!-- KPI CARDS (2-TIER CLEAN STRUCTURE) -->
		<div class="space-y-4">
			<!-- ROW 1: FINANCIAL OVERVIEW (4 COLS) -->
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Total Omset -->
				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card flex flex-col justify-between">
					<div>
						<p class="text-sm font-semibold text-[#4A3B32]/70 dark:text-muted-foreground">Total Omset (Selesai)</p>
						<p class="mt-2 break-words text-2xl font-bold leading-tight text-[#4A3B32] sm:text-3xl dark:text-foreground">{formatCurrency(totalRevenue)}</p>
					</div>
					<p class="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 w-fit px-2 py-1 rounded-md">Forecast: {formatCurrency(data.summary.grossRevenue)}</p>
				</div>

				<!-- Profit -->
				<div class="rounded-2xl border border-emerald-500/20 bg-emerald-50/40 p-4 shadow-sm sm:p-5 dark:bg-emerald-950/20 flex flex-col justify-between">
					<div>
						<p class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Profit (Laba Bersih)</p>
						<p class="mt-2 break-words text-2xl font-bold leading-tight text-emerald-900 sm:text-3xl dark:text-emerald-100">{formatCurrency(data.summary.profit)}</p>
					</div>
					<p class="mt-3 text-xs font-medium text-emerald-700/80 dark:text-emerald-300/80">Omset - Pengeluaran</p>
				</div>

				<!-- Total Pengeluaran -->
				<div class="rounded-2xl border border-rose-500/20 bg-rose-50/40 p-4 shadow-sm sm:p-5 dark:bg-rose-950/20 flex flex-col justify-between">
					<div>
						<p class="text-sm font-semibold text-rose-800 dark:text-rose-300">Total Pengeluaran</p>
						<p class="mt-2 break-words text-2xl font-bold leading-tight text-rose-900 sm:text-3xl dark:text-rose-100">{formatCurrency(data.summary.totalExpenses)}</p>
					</div>
					<div class="mt-3 flex items-center gap-2 text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
						<span>Ops: {formatCurrency(data.summary.operationalExpenses)}</span>
						<span class="size-1 rounded-full bg-rose-300"></span>
						<span>Ongkir: {formatCurrency(data.summary.deliveryExpenses)}</span>
					</div>
				</div>

				<!-- Total Penjualan -->
				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card flex flex-col justify-between">
					<div>
						<p class="text-sm font-semibold text-[#4A3B32]/70 dark:text-muted-foreground">Total Penjualan</p>
						<p class="mt-2 text-2xl font-bold leading-tight text-[#4A3B32] sm:text-3xl dark:text-foreground">{totalSales}</p>
					</div>
					<p class="mt-3 text-xs font-semibold text-primary bg-primary/5 w-fit px-2 py-1 rounded-md">AOV: {formatCurrency(data.summary.averageOrderValue)}</p>
				</div>
			</div>

			<!-- ROW 2: CUSTOMERS & COMBINED STATUS (4 COLS) -->
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Pelanggan Setia -->
				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card">
					<div class="flex items-center justify-between gap-2">
						<p class="text-sm font-semibold text-[#4A3B32]/70 dark:text-muted-foreground">Pelanggan Setia</p>
						<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
							{data.summary.repeatOrders} Repeat
						</span>
					</div>
					<p class="mt-2 text-2xl font-bold leading-tight text-[#4A3B32] sm:text-3xl dark:text-foreground">{data.summary.repeatCustomers}</p>
					<p class="mt-2 text-xs text-[#4A3B32]/70 dark:text-muted-foreground">Pelanggan pesan &gt; 1x.</p>
				</div>

				<!-- Repeat Order Rate -->
				<div class="rounded-2xl border border-emerald-500/20 bg-emerald-50/40 p-4 shadow-sm sm:p-5 dark:bg-emerald-950/20">
					<div class="flex items-center justify-between gap-2">
						<p class="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Repeat Order Rate</p>
						<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">Retensi</span>
					</div>
					<p class="mt-2 text-2xl font-bold leading-tight text-emerald-900 sm:text-3xl dark:text-emerald-100">{data.summary.repeatOrderRate}%</p>
					<p class="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">Rasio pesanan berulang.</p>
				</div>

				<!-- Combined Status (Spans 2 cols) -->
				<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card lg:col-span-2">
					<p class="text-sm font-semibold text-[#4A3B32]/70 dark:text-muted-foreground mb-3">Status Pesanan</p>
					<div class="grid grid-cols-4 gap-2 h-full pb-4">
						<!-- Pending -->
						<div class="rounded-xl border border-amber-200/50 bg-amber-50/50 p-2 text-center flex flex-col justify-center dark:bg-amber-950/20">
							<p class="text-[10px] font-semibold text-amber-800 dark:text-amber-300 uppercase">Pending</p>
							<p class="mt-1 text-lg font-bold text-amber-900 dark:text-amber-100">{data.summary.pending}</p>
						</div>
						<!-- Diproses -->
						<div class="rounded-xl border border-sky-200/50 bg-sky-50/50 p-2 text-center flex flex-col justify-center dark:bg-sky-950/20">
							<p class="text-[10px] font-semibold text-sky-800 dark:text-sky-300 uppercase">Diproses</p>
							<p class="mt-1 text-lg font-bold text-sky-900 dark:text-sky-100">{data.summary.processing}</p>
						</div>
						<!-- Selesai -->
						<div class="rounded-xl border border-emerald-200/50 bg-emerald-50/50 p-2 text-center flex flex-col justify-center dark:bg-emerald-950/20">
							<p class="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Selesai</p>
							<p class="mt-1 text-lg font-bold text-emerald-900 dark:text-emerald-100">{data.summary.completed}</p>
						</div>
						<!-- Batal/Refund -->
						<div class="rounded-xl border border-rose-200/50 bg-rose-50/50 p-2 text-center flex flex-col justify-center dark:bg-rose-950/20">
							<p class="text-[10px] font-semibold text-rose-800 dark:text-rose-300 uppercase">Batal</p>
							<p class="mt-1 text-lg font-bold text-rose-900 dark:text-rose-100">{data.summary.cancelled}</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- REVENUE & DELIVERY ANALYTICS CHART -->
		<RevenueAnalyticsChart
			series={data.revenueSeries}
			{groupBy}
			onGroupByChange={handleGroupByChange}
		/>

		<!-- TOP PRODUCTS, STATUS BREAKDOWN & REPEAT CUSTOMERS MID GRID -->
		<div class="grid gap-4 lg:grid-cols-3">
			<TopProductsCard products={topProducts} />
			<OrderStatusBreakdownCard
				breakdown={statusBreakdown}
				onStatusSelect={(status) => navigateFilters({ status })}
			/>
			<RepeatCustomersCard
				data={repeatCustomersData}
			/>
		</div>
	</div>

	<!-- SECTION 1: PESANAN PENDING (TOP 5 ITEMS + SHOW ALL) -->
	<div class="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm sm:rounded-[1.5rem] dark:bg-card">
		<!-- HEADER -->
		<div class="flex flex-col gap-3 border-b border-primary/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<span class="size-2 rounded-full bg-amber-500"></span>
					<p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4A3B32]/70 sm:text-xs sm:tracking-widest dark:text-muted-foreground">
						Perlu Diproses Segera
					</p>
				</div>
				<h2 class="mt-1 text-lg font-bold leading-tight text-[#4A3B32] sm:mt-1.5 sm:text-xl dark:text-foreground">
					Daftar Order Pending
				</h2>
				<p class="mt-0.5 text-xs leading-relaxed text-[#4A3B32]/70 dark:text-muted-foreground">
					{#if startDate && endDate}
						Menampilkan {displayPendingOrders.length} dari {pendingOrders.length} pesanan pending pada rentang {startDate} sampai {endDate}.
					{:else}
						Menampilkan {displayPendingOrders.length} dari {pendingOrders.length} pesanan pending.
					{/if}
				</p>
			</div>

			<!-- ACTIONS -->
			<div class="flex items-center gap-2">
				<Button href={pendingShowAllHref} variant="outline" size="sm" class="rounded-xl text-xs font-bold gap-1.5">
					<span>Lihat Semua ({pendingOrders.length})</span>
					<ArrowRight class="size-3.5" />
				</Button>
			</div>
		</div>

		<!-- MOBILE CARD LIST -->
		<div class="grid gap-3 p-3 md:hidden">
			{#each displayPendingOrders as order}
				<article class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-border/60 dark:bg-card">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="text-xs font-semibold uppercase tracking-wide text-primary">#{order.order_number}</p>
							<h3 class="mt-1 truncate text-base font-bold text-[#4A3B32] dark:text-foreground">{order.customer_name}</h3>
						</div>
						<span class="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
							Pending
						</span>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50 dark:text-muted-foreground">Produk</p>
							<p class="mt-1 line-clamp-2 font-medium text-[#4A3B32] dark:text-foreground">
								{#if order.order_items && order.order_items.length > 0}
									{order.order_items[0].products?.name ?? order.order_items[0].productName ?? 'Unknown'}
									{#if order.order_items.length > 1}
										<span class="text-primary">+{order.order_items.length - 1} lainnya</span>
									{/if}
								{:else if order.productName || order.product_name}
									{order.productName || order.product_name}
								{:else}
									{order.itemsCount ? `${order.itemsCount} item` : 'Pesanan'}
								{/if}
							</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50 dark:text-muted-foreground">Tanggal Kirim / Ambil</p>
							<button
								type="button"
								onclick={(e) => openScheduleDrawer(order, e)}
								class="mt-1 font-medium text-[#4A3B32] dark:text-foreground inline-flex items-center gap-1.5 hover:text-primary active:scale-95 transition-all text-left group/sched cursor-pointer"
								title="Klik untuk atur ulang tanggal & jam"
							>
								<span>{formatDate(order.delivery_date || order.pickup_date)}{order.delivery_time || order.pickup_time ? ` (${order.delivery_time || order.pickup_time})` : ''}</span>
								<svg class="w-3 h-3 text-slate-400 opacity-60 group-hover/sched:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
							</button>
						</div>
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50 dark:text-muted-foreground">Qty / Tipe</p>
							<p class="mt-1 font-medium text-[#4A3B32] dark:text-foreground">
								{order.order_items ? order.order_items.length : (order.itemsCount || order.quantity || 1)} item
							</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50 dark:text-muted-foreground">Total</p>
							<p class="mt-1 font-bold text-[#4A3B32] dark:text-foreground">{formatCurrency(order.amount)}</p>
						</div>
					</div>
					<Button variant="outline" size="sm" class="mt-4 h-10 w-full rounded-xl text-sm font-semibold active:scale-[0.98]" onclick={() => openDrawer(order)}>
						Kelola
					</Button>
				</article>
			{:else}
				<div class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-[#4A3B32]/70 dark:border-border dark:text-muted-foreground">
					Tidak ada pesanan pending pada periode ini.
				</div>
			{/each}
		</div>

		<!-- DESKTOP TABLE -->
		<div class="hidden overflow-x-auto md:block">
			<table class="min-w-205 w-full text-left text-sm text-[#4A3B32] dark:text-foreground">
				<thead class="bg-slate-50 text-[#4A3B32]/70 text-xs uppercase tracking-wide dark:bg-muted/50 dark:text-muted-foreground">
					<tr>
						<th class="px-4 py-3.5">No Order</th>
						<th class="px-4 py-3.5">Nama</th>
						<th class="px-4 py-3.5">Produk</th>
						<th class="px-4 py-3.5">Pengiriman</th>
						<th class="px-4 py-3.5">Tanggal Kirim / Ambil</th>
						<th class="px-4 py-3.5">Total</th>
						<th class="px-4 py-3.5">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200 bg-white dark:divide-border/40 dark:bg-card">
					{#each displayPendingOrders as order}
						<tr class="hover:bg-slate-50 transition-colors dark:hover:bg-muted/30">
							<td class="px-4 py-3.5 font-semibold text-[#4A3B32] dark:text-foreground">#{order.order_number}</td>
							<td class="px-4 py-3.5">
								<div class="font-medium text-foreground">{order.customer_name}</div>
								{#if order.phone_number}
									<div class="text-xs text-muted-foreground font-mono">{order.phone_number}</div>
								{/if}
							</td>
							<td class="px-4 py-3.5">
								{#if order.order_items && order.order_items.length > 0}
									{order.order_items[0].products?.name ?? order.order_items[0].productName ?? 'Unknown'}
									{#if order.order_items.length > 1}
										<br><span class="text-xs text-primary font-semibold">+{order.order_items.length - 1} produk lainnya</span>
									{/if}
								{:else if order.productName || order.product_name}
									{order.productName || order.product_name}
								{:else}
									{order.itemsCount ? `${order.itemsCount} item` : 'Data pesanan'}
								{/if}
							</td>
							<td class="px-4 py-3.5">
								<span class="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs font-semibold text-muted-foreground">
									{#if String(order.delivery_option || '').toLowerCase() === 'pickup'}
										<Store class="size-3.5 text-primary" /> Pickup
									{:else}
										<Truck class="size-3.5 text-primary" /> Delivery
									{/if}
								</span>
							</td>
							<td class="px-4 py-3.5">
								<button
									type="button"
									onclick={(e) => openScheduleDrawer(order, e)}
									class="font-medium text-[#4A3B32] dark:text-foreground inline-flex items-center gap-1.5 hover:text-primary px-2 py-1 -mx-2 rounded-lg hover:bg-slate-100 dark:hover:bg-muted active:scale-95 transition-all text-left group/sched cursor-pointer"
									title="Klik untuk atur ulang tanggal & jam"
								>
									<span>{formatDate(order.delivery_date || order.pickup_date)}{order.delivery_time || order.pickup_time ? ` (${order.delivery_time || order.pickup_time})` : ''}</span>
									<svg class="w-3 h-3 text-slate-400 opacity-60 group-hover/sched:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
								</button>
							</td>
							<td class="px-4 py-3.5 font-semibold text-[#4A3B32] dark:text-foreground">{formatCurrency(order.amount)}</td>
							<td class="px-4 py-3.5">
								<Button variant="outline" size="sm" class="rounded-full px-4 py-1.5 text-xs font-semibold" onclick={() => openDrawer(order)}>
									Kelola
								</Button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-4 py-8 text-center text-sm text-[#4A3B32]/70 dark:text-muted-foreground">
								Tidak ada pesanan pending pada periode ini.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- SECTION 2: PESANAN TERBARU (TOP 5 ITEMS + SHOW ALL) -->
	<div class="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm sm:rounded-[1.5rem] dark:bg-card">
		<!-- HEADER -->
		<div class="flex flex-col gap-3 border-b border-primary/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<span class="size-2 rounded-full bg-primary"></span>
					<p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4A3B32]/70 sm:text-xs sm:tracking-widest dark:text-muted-foreground">
						Aktivitas Transaksi Masuk
					</p>
				</div>
				<h2 class="mt-1 text-lg font-bold leading-tight text-[#4A3B32] sm:mt-1.5 sm:text-xl dark:text-foreground">
					Daftar Pesanan Terbaru
				</h2>
				<p class="mt-0.5 text-xs leading-relaxed text-[#4A3B32]/70 dark:text-muted-foreground">
					{#if startDate && endDate}
						Menampilkan {displayRecentOrders.length} dari {recentOrders.length} pesanan terbaru lintas status pada rentang {startDate} sampai {endDate}.
					{:else}
						Menampilkan {displayRecentOrders.length} dari {recentOrders.length} pesanan terbaru lintas status.
					{/if}
				</p>
			</div>

			<!-- ACTIONS -->
			<div class="flex items-center gap-2">
				<Button href={recentShowAllHref} variant="outline" size="sm" class="rounded-xl text-xs font-bold gap-1.5">
					<span>Lihat Semua ({recentOrders.length})</span>
					<ArrowRight class="size-3.5" />
				</Button>
			</div>
		</div>

		<!-- MOBILE CARD LIST -->
		<div class="grid gap-3 p-3 md:hidden">
			{#each displayRecentOrders as order}
				{@const statusInfo = getStatusBadge(order.status)}
				<article class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-border/60 dark:bg-card">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="text-xs font-semibold uppercase tracking-wide text-primary">#{order.order_number}</p>
							<h3 class="mt-1 truncate text-base font-bold text-[#4A3B32] dark:text-foreground">{order.customer_name}</h3>
						</div>
						<div class="flex flex-col items-end gap-1">
							<span class={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold', statusInfo.class)}>
								{statusInfo.label}
							</span>
							<span class="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
								{#if String(order.delivery_option || '').toLowerCase() === 'pickup'}
									<Store class="size-3 text-primary" /> Pickup
								{:else}
									<Truck class="size-3 text-primary" /> Delivery
								{/if}
							</span>
						</div>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-3 text-sm">
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50 dark:text-muted-foreground">Tanggal Kirim / Ambil</p>
							<button
								type="button"
								onclick={(e) => openScheduleDrawer(order, e)}
								class="mt-1 font-medium text-[#4A3B32] dark:text-foreground inline-flex items-center gap-1.5 hover:text-primary active:scale-95 transition-all text-left group/sched cursor-pointer"
								title="Klik untuk atur ulang tanggal & jam"
							>
								<span>{formatDate(order.delivery_date || order.pickup_date)}{order.delivery_time || order.pickup_time ? ` (${order.delivery_time || order.pickup_time})` : ''}</span>
								<svg class="w-3 h-3 text-slate-400 opacity-60 group-hover/sched:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
							</button>
						</div>
						<div>
							<p class="text-xs font-semibold text-[#4A3B32]/50 dark:text-muted-foreground">Opsi</p>
							<p class="mt-1 font-medium text-[#4A3B32] dark:text-foreground">
								{String(order.delivery_option || '').toLowerCase() === 'pickup' ? 'Ambil di Toko' : 'Kurir Toko'}
							</p>
						</div>
						<div class="col-span-2">
							<p class="text-xs font-semibold text-[#4A3B32]/50 dark:text-muted-foreground">Total</p>
							<p class="mt-1 font-bold text-[#4A3B32] dark:text-foreground">{formatCurrency(order.amount)}</p>
						</div>
					</div>
					<Button variant="outline" size="sm" class="mt-4 h-10 w-full rounded-xl text-sm font-semibold active:scale-[0.98]" onclick={() => openDrawer(order)}>
						Kelola
					</Button>
				</article>
			{:else}
				<div class="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-[#4A3B32]/70 dark:border-border dark:text-muted-foreground">
					Tidak ada pesanan terbaru pada periode ini.
				</div>
			{/each}
		</div>

		<!-- DESKTOP TABLE -->
		<div class="hidden overflow-x-auto md:block">
			<table class="min-w-205 w-full text-left text-sm text-[#4A3B32] dark:text-foreground">
				<thead class="bg-slate-50 text-[#4A3B32]/70 text-xs uppercase tracking-wide dark:bg-muted/50 dark:text-muted-foreground">
					<tr>
						<th class="px-4 py-3.5">No Order</th>
						<th class="px-4 py-3.5">Nama</th>
						<th class="px-4 py-3.5">Status</th>
						<th class="px-4 py-3.5">Pengiriman</th>
						<th class="px-4 py-3.5">Tanggal Kirim / Ambil</th>
						<th class="px-4 py-3.5">Total</th>
						<th class="px-4 py-3.5">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200 bg-white dark:divide-border/40 dark:bg-card">
					{#each displayRecentOrders as order}
						{@const statusInfo = getStatusBadge(order.status)}
						<tr class="hover:bg-slate-50 transition-colors dark:hover:bg-muted/30">
							<td class="px-4 py-3.5 font-semibold text-[#4A3B32] dark:text-foreground">#{order.order_number}</td>
							<td class="px-4 py-3.5">
								<div class="font-medium text-foreground">{order.customer_name}</div>
								{#if order.phone_number}
									<div class="text-xs text-muted-foreground font-mono">{order.phone_number}</div>
								{/if}
							</td>
							<td class="px-4 py-3.5">
								<span class={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold', statusInfo.class)}>
									{statusInfo.label}
								</span>
							</td>
							<td class="px-4 py-3.5">
								<span class="inline-flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-xs font-semibold text-muted-foreground">
									{#if String(order.delivery_option || '').toLowerCase() === 'pickup'}
										<Store class="size-3.5 text-primary" /> Pickup
									{:else}
										<Truck class="size-3.5 text-primary" /> Delivery
									{/if}
								</span>
							</td>
							<td class="px-4 py-3.5">
								<button
									type="button"
									onclick={(e) => openScheduleDrawer(order, e)}
									class="font-medium text-[#4A3B32] dark:text-foreground inline-flex items-center gap-1.5 hover:text-primary px-2 py-1 -mx-2 rounded-lg hover:bg-slate-100 dark:hover:bg-muted active:scale-95 transition-all text-left group/sched cursor-pointer"
									title="Klik untuk atur ulang tanggal & jam"
								>
									<span>{formatDate(order.delivery_date || order.pickup_date)}{order.delivery_time || order.pickup_time ? ` (${order.delivery_time || order.pickup_time})` : ''}</span>
									<svg class="w-3 h-3 text-slate-400 opacity-60 group-hover/sched:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
								</button>
							</td>
							<td class="px-4 py-3.5 font-semibold text-[#4A3B32] dark:text-foreground">{formatCurrency(order.amount)}</td>
							<td class="px-4 py-3.5">
								<Button variant="outline" size="sm" class="rounded-full px-4 py-1.5 text-xs font-semibold" onclick={() => openDrawer(order)}>
									Kelola
								</Button>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="px-4 py-8 text-center text-sm text-[#4A3B32]/70 dark:text-muted-foreground">
								Tidak ada pesanan terbaru pada periode ini.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</AdminPage>

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
					<OrderStatusSelect order={selectedOrder} onProofRequired={openDeliveryProof} onUpdated={onProofOrderUpdated} disabled={proofDialogOpen} />
				</div>
				<hr class="border-primary/10" />
				<div class="space-y-3">
					<div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
						<div class="min-w-0 pr-2">
							<p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jadwal Pengiriman / Pickup</p>
							<p class="text-sm font-bold text-[#4A3B32] mt-0.5 truncate">
								{formatDate(selectedOrder.delivery_date || selectedOrder.pickup_date)}
								{selectedOrder.delivery_time || selectedOrder.pickup_time ? ` (${selectedOrder.delivery_time || selectedOrder.pickup_time})` : ''}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							class="rounded-xl text-xs font-bold border-slate-300 hover:bg-white active:scale-95 transition-all shrink-0"
							onclick={() => openScheduleDrawer(selectedOrder)}
						>
							Ubah Jadwal
						</Button>
					</div>
				</div>
				<hr class="border-primary/10" />
				<DeliveryProofGallery order={selectedOrder} onReplace={openDeliveryProof} disabled={proofDialogOpen} />
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

<OrderScheduleDrawer
	bind:open={isScheduleDrawerOpen}
	order={scheduleOrder}
	actionUrl="?/updateSchedule"
	onSuccess={() => {
		if (selectedOrder && scheduleOrder && selectedOrder.id === scheduleOrder.id) {
			selectedOrder = {
				...selectedOrder,
				delivery_option: scheduleOrder.delivery_option,
				delivery_date: scheduleOrder.delivery_date,
				delivery_time: scheduleOrder.delivery_time,
				pickup_date: scheduleOrder.pickup_date,
				pickup_time: scheduleOrder.pickup_time
			};
		}
	}}
/>


{#if proofOrder}
	<DeliveryProofDialog bind:open={proofDialogOpen} order={proofOrder} targetStatus={proofTargetStatus} onUpdated={onProofOrderUpdated} />
{/if}
