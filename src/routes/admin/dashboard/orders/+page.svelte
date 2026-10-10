<script>
	import OrderStatusSelect from '$lib/components/admin/OrderStatusSelect.svelte';
	import DeliveryProofDialog from '$lib/components/admin/DeliveryProofDialog.svelte';
	import DeliveryProofGallery from '$lib/components/admin/DeliveryProofGallery.svelte';
	import { ORDER_STATUS_OPTIONS, orderStatusLabel, DELIVERY_PROOF_FIELDS } from '$lib/order-delivery-proof.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { fly, fade } from 'svelte/transition';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminSearchField from '$lib/components/admin/AdminSearchField.svelte';
	import { createDebouncedValue } from '$lib/debounced-value.svelte.js';
	import AdminViewToggle from '$lib/components/admin/AdminViewToggle.svelte';
	import OrderScheduleDrawer from '$lib/components/admin/OrderScheduleDrawer.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import { getDashboardDateRange } from '$lib/admin-order-dates.js';
	import { onDestroy, untrack } from 'svelte';
	import { sendAdminInvoiceWhatsApp, sendAdminInvoiceEmail, getAdminOrder } from '$lib/api/admin';
	import { adaptOrder } from '$lib/api/adapters';
	import { getWhatsAppHref } from '$lib/site-info';
	import { cn } from '$lib/utils';
	import Plus from '@lucide/svelte/icons/plus';
	import Truck from '@lucide/svelte/icons/truck';
	import Store from '@lucide/svelte/icons/store';
	import Check from '@lucide/svelte/icons/check';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	let { data, form } = $props();

	// Create Order State
	let isCreateOrderDrawerOpen = $state(false);
	let isCreatingOrder = $state(false);

	let newCustomerName = $state('');
	let newPhoneNumber = $state('');
	let newEmail = $state('');
	let newDeliveryOption = $state('delivery'); // 'delivery' | 'pickup'
	let newAddress = $state('');
	let newDeliveryDate = $state(untrack(() => data.filters?.today || new Date().toISOString().split('T')[0]));
	let newDeliveryTime = $state('10:00');
	let newDeliveryVehicle = $state('Motor');
	let newStatus = $state('Pending');
	$effect(() => { if (newDeliveryOption === 'delivery' && newStatus === 'Completed') newStatus = 'Pending'; });
	let newProductId = $state('');
	let newProductVariantId = $state('');
	let newQuantity = $state(1);
	let newCakeText = $state('');
	let newGiftCardText = $state('');
	let newSelectedAddonIds = $state([]);
	let newCustomCakePrice = $state('');
	let newDeliveryFee = $state(0);
	let newSendConfirmationEmail = $state(true);
	let newOrderAddonSearch = $state('');
	const getSettledAddonSearch = createDebouncedValue(() => newOrderAddonSearch);
	let newOrderAddonCategory = $state('all');
	let newOrderAddonScope = $state('product'); // 'product' | 'all'

	let products = $derived(data.products || []);
	let globalAddons = $derived(data.addons || []);

	let selectedProduct = $derived(products.find((p) => p.id === newProductId));
	let productVariants = $derived(selectedProduct?.variants || []);
	let selectedVariant = $derived(productVariants.find((v) => v.id === newProductVariantId));

	// Effective base unit price
	let baseUnitPrice = $derived(
		selectedVariant?.price ?? selectedProduct?.base_price ?? selectedProduct?.price ?? 0
	);

	let hasProductSpecificAddons = $derived(
		Boolean(selectedProduct?.addons && selectedProduct.addons.length > 0)
	);

	// Effective pool based on user toggle: product-specific vs all global
	let effectiveAddonPool = $derived.by(() => {
		if (newOrderAddonScope === 'product' && hasProductSpecificAddons) {
			return selectedProduct.addons;
		}
		return globalAddons;
	});

	// Unique categories in the current addon pool
	let addonCategories = $derived.by(() => {
		const cats = effectiveAddonPool
			.map((a) => (a.category || '').trim())
			.filter(Boolean);
		return [...new Set(cats)].sort((a, b) => a.localeCompare(b, 'id'));
	});

	// Filtered addons matching search query and selected category tab
	let visibleOrderAddons = $derived.by(() => {
		const query = getSettledAddonSearch().trim().toLowerCase();
		return effectiveAddonPool.filter((addon) => {
			const matchCategory =
				newOrderAddonCategory === 'all' ||
				(addon.category || '').trim().toLowerCase() === newOrderAddonCategory.toLowerCase();
			if (!matchCategory) return false;

			if (!query) return true;
			const matchName = (addon.name || '').toLowerCase().includes(query);
			const matchCat = (addon.category || '').toLowerCase().includes(query);
			return matchName || matchCat;
		});
	});

	// Map of all known addons (both product and global) to safely retrieve details by ID
	let allKnownAddonsMap = $derived.by(() => {
		const map = new Map();
		for (const a of globalAddons) {
			if (a?.id) map.set(a.id, a);
		}
		if (selectedProduct?.addons) {
			for (const a of selectedProduct.addons) {
				if (a?.id) map.set(a.id, a);
			}
		}
		return map;
	});

	let selectedAddonsList = $derived(
		newSelectedAddonIds
			.map((id) => allKnownAddonsMap.get(id))
			.filter(Boolean)
	);

	let addonsUnitPrice = $derived(
		selectedAddonsList.reduce(
			(acc, a) => acc + Number(a.additional_price ?? a.price ?? a.additionalPrice ?? 0),
			0
		)
	);

	let calculatedCakePrice = $derived(
		(Number(baseUnitPrice || 0) + Number(addonsUnitPrice || 0)) * Math.max(1, Number(newQuantity || 1))
	);

	let effectiveCakePrice = $derived(
		newCustomCakePrice !== '' && !isNaN(Number(newCustomCakePrice))
			? Number(newCustomCakePrice)
			: calculatedCakePrice
	);

	let calculatedFinalAmount = $derived(
		Number(effectiveCakePrice || 0) + (newDeliveryOption === 'delivery' ? Number(newDeliveryFee || 0) : 0)
	);

	function openCreateOrderDrawer() {
		newCustomerName = '';
		newPhoneNumber = '';
		newEmail = '';
		newDeliveryOption = 'delivery';
		newAddress = '';
		newDeliveryDate = data.filters?.today || new Date().toISOString().split('T')[0];
		newDeliveryTime = '10:00';
		newDeliveryVehicle = 'Motor';
		newStatus = 'Pending';
		newProductId = products[0]?.id || '';
		newProductVariantId = '';
		newQuantity = 1;
		newCakeText = '';
		newGiftCardText = '';
		newSelectedAddonIds = [];
		newCustomCakePrice = '';
		newDeliveryFee = 0;
		newSendConfirmationEmail = true;
		newOrderAddonSearch = '';
		newOrderAddonCategory = 'all';
		newOrderAddonScope = 'product';
		isCreateOrderDrawerOpen = true;
	}

	function closeCreateOrderDrawer() {
		isCreateOrderDrawerOpen = false;
	}

	function toggleNewOrderAddon(addonId) {
		if (newSelectedAddonIds.includes(addonId)) {
			newSelectedAddonIds = newSelectedAddonIds.filter((id) => id !== addonId);
		} else {
			newSelectedAddonIds = [...newSelectedAddonIds, addonId];
		}
	}

	function selectAllVisibleAddons() {
		const visibleIds = visibleOrderAddons.map((a) => a.id).filter(Boolean);
		newSelectedAddonIds = [...new Set([...newSelectedAddonIds, ...visibleIds])];
	}

	function clearVisibleAddons() {
		const visibleIds = new Set(visibleOrderAddons.map((a) => a.id));
		newSelectedAddonIds = newSelectedAddonIds.filter((id) => !visibleIds.has(id));
	}

	function clearAllSelectedAddons() {
		newSelectedAddonIds = [];
	}

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
		if (!amount && amount !== 0) return '-';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
	}

	function getDeliveryOption(order) {
		if (order.delivery_option === 'pickup' || order.delivery_option === 'delivery') {
			return order.delivery_option;
		}
		return (order.address || '').toLowerCase() === 'pickup' ? 'pickup' : 'delivery';
	}

	function getDeliveryOptionLabel(order) {
		return getDeliveryOption(order) === 'pickup' ? 'Pickup' : 'Delivery';
	}

	function getItemOption(item, key, fallback = '-') {
		return item.customized_options?.[key]?.name || fallback || '-';
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
	let loadingDetail = $state(false);
	let uploadingReceipt = $state(false);
	let sendingInvoice = $state(false);
	let sendingEmailInvoice = $state(false);
	let invoiceStatus = $state(null); // { success: bool, message: string }
	let emailInvoiceStatus = $state(null);

	// Harga State
	let draftCakePrice = $state(0);
	let draftDeliveryFee = $state(0);
	let draftDeliveryVehicle = $state('Bike');
	let calculatedTotal = $derived(Number(draftCakePrice || 0) + Number(draftDeliveryFee || 0));

	// Filters State
	let searchQuery = $state(untrack(() => data.filters.q));
	let statusFilter = $state(untrack(() => data.filters.status));
	let dateMode = $state('all');
	let customStart = $state(untrack(() => data.filters.start || ''));
	let customEnd = $state(untrack(() => data.filters.end || ''));
	let startDate = $state(untrack(() => data.filters.start || ''));
	let endDate = $state(untrack(() => data.filters.end || ''));
	let dateTypeFilter = $state(untrack(() => data.filters.dateType));
	let viewMode = $state('list');
	let searchTimer;
	const SEARCH_DEBOUNCE_MS = 700;

	let filteredOrders = $derived(data.orders);
	let pagination = $derived(data.pagination);
	let hasActiveFilters = $derived(Boolean(searchQuery || statusFilter !== 'All' || dateMode !== 'all' || (dateTypeFilter !== 'delivery_date' && (startDate || endDate))));
	let exportHref = $derived(`/admin/dashboard/orders/export?${page.url.searchParams.toString()}`);

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
		if (!searchTimer) searchQuery = data.filters.q;
		statusFilter = data.filters.status;
		customStart = data.filters.start || '';
		customEnd = data.filters.end || '';
		startDate = data.filters.start || '';
		endDate = data.filters.end || '';
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
			page: 1,
			...overrides
		};
		const params = new URLSearchParams();
		if (values.q) params.set('q', values.q);
		if (values.status && values.status !== 'All') params.set('status', values.status);
		if (values.date_type && values.date_type !== 'delivery_date') params.set('date_type', values.date_type);
		if (values.start) params.set('start', values.start);
		if (values.end) params.set('end', values.end);
		if (Number(values.page) > 1) params.set('page', String(values.page));
		const query = params.toString();
		return `/admin/dashboard/orders${query ? `?${query}` : ''}`;
	}

	function navigateFilters(overrides = {}) {
		return goto(getFilterHref(overrides), { replaceState: true, keepFocus: true, noScroll: true });
	}

	function queueSearch(value) {
		searchQuery = value;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			searchTimer = undefined;
			if (value.trim() !== data.filters.q) void navigateFilters({ q: value.trim(), page: 1 });
		}, SEARCH_DEBOUNCE_MS);
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

	function resetFilters() {
		clearTimeout(searchTimer);
		searchTimer = undefined;
		searchQuery = '';
		statusFilter = 'All';
		dateMode = 'all';
		customStart = '';
		customEnd = '';
		startDate = '';
		endDate = '';
		dateTypeFilter = 'delivery_date';
		navigateFilters({ q: '', status: 'All', start: '', end: '', date_type: 'delivery_date', page: 1 });
	}

	onDestroy(() => clearTimeout(searchTimer));

	async function openDrawer(order) {
		selectedOrder = order;
		draftCakePrice = order.cake_price || order.amount || 0;
		draftDeliveryFee = order.delivery_fee || 0;
		draftDeliveryVehicle = order.delivery_vehicle || 'Bike';
		uploadingReceipt = false;
		sendingInvoice = false;
		sendingEmailInvoice = false;
		invoiceStatus = null;
		emailInvoiceStatus = null;
		isDrawerOpen = true;

		// Fetch full detail with customizedOptions and line items
		loadingDetail = true;
		try {
			const detailData = await getAdminOrder(order.id);
			if (detailData) {
				const fullOrder = adaptOrder(detailData);
				if (selectedOrder && selectedOrder.id === order.id) {
					selectedOrder = fullOrder;
					draftCakePrice = fullOrder.cake_price || fullOrder.amount || 0;
					draftDeliveryFee = fullOrder.delivery_fee || 0;
					draftDeliveryVehicle = fullOrder.delivery_vehicle || 'Bike';
				}
			}
		} catch (err) {
			console.warn('Unable to hydrate full order detail:', err);
		} finally {
			loadingDetail = false;
		}
	}

	function closeDrawer() {
		isDrawerOpen = false;
		selectedOrder = null;
		loadingDetail = false;
		uploadingReceipt = false;
		sendingInvoice = false;
		sendingEmailInvoice = false;
		invoiceStatus = null;
		emailInvoiceStatus = null;
	}

	async function sendInvoice(orderId) {
		sendingInvoice = true;
		invoiceStatus = null;
		try {
			await sendAdminInvoiceWhatsApp(orderId);
			invoiceStatus = { success: true, message: 'Invoice WhatsApp berhasil dikirim!' };
		} catch (err) {
			invoiceStatus = { success: false, message: err?.message || 'Gagal menghubungi server WhatsApp.' };
		}
		sendingInvoice = false;
	}

	async function sendEmailInvoice(orderId) {
		sendingEmailInvoice = true;
		emailInvoiceStatus = null;
		try {
			await sendAdminInvoiceEmail(orderId);
			emailInvoiceStatus = { success: true, message: 'Invoice Email berhasil dikirim!' };
		} catch (err) {
			emailInvoiceStatus = { success: false, message: err?.message || 'Gagal menghubungi server email.' };
		}
		sendingEmailInvoice = false;
	}
</script>

<AdminPage>
	<AdminPageHeader title="Daftar Pesanan" description="Cari, filter, dan kelola pesanan pelanggan dari satu tempat.">
		{#snippet actions()}
			<Button
				type="button"
				onclick={openCreateOrderDrawer}
				class="gap-1.5 font-bold transition-transform duration-150 active:scale-[0.98]"
			>
				<Plus class="size-4" />
				<span>Tambah Pesanan</span>
			</Button>
			<AdminViewToggle bind:value={viewMode} />
			<Button href={exportHref} variant="outline" class="gap-2 active:scale-95 transition-transform duration-150">
				<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
				Export Excel
			</Button>
		{/snippet}
	</AdminPageHeader>

	{#if form?.success && form?.message}
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in duration-200">
			✓ {form.message}
		</div>
	{:else if form?.error}
		<div class="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive animate-in fade-in duration-200">
			Error: {form.error}
		</div>
	{/if}

	<!-- Filters Header Bar -->
	<div class="rounded-2xl border border-primary/10 bg-white p-3 shadow-sm sm:p-4">
		<div class="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-start">
			<!-- Search -->
			<div class="w-full">
				<AdminSearchField bind:value={searchQuery} onValueChange={queueSearch} placeholder="Cari nama pelanggan, #order, HP, email..." label="Cari pesanan" />
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

				{#if hasActiveFilters}
					<Button variant="outline" class="col-span-2 h-10 w-full sm:col-span-4 lg:col-span-4" onclick={resetFilters}>
						Reset Filter / Tampilkan Semua
					</Button>
				{/if}
			</div>
		</div>
	</div>

	{#if form?.error}
		<div class="p-4 bg-red-50 text-red-700 font-medium text-sm rounded-xl mb-4 border border-red-200 flex items-center gap-2">
			<svg class="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
			<span>Error: {form.error}</span>
		</div>
	{/if}

	<!-- Order Cards View -->
	{#if viewMode === 'card'}
		<div class="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5 pb-4">
			{#each filteredOrders as order (order.id)}
				<Card.Root class="group border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between">
					<Card.Content class="p-5 flex flex-col gap-4 flex-1">
						<!-- Header Card -->
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2 mb-1">
									<span class="text-xs font-black tracking-wider text-slate-400">#{order.order_number}</span>
									<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider {getDeliveryOption(order) === 'pickup' ? 'bg-amber-100/80 text-amber-800' : 'bg-sky-100/80 text-sky-800'}">
										{#if getDeliveryOption(order) === 'pickup'}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
										{:else}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
										{/if}
										{getDeliveryOptionLabel(order)}
									</span>
								</div>
								<h3 class="font-bold text-slate-800 text-lg leading-tight truncate group-hover:text-slate-900 transition-colors">{order.customer_name}</h3>
								
								<!-- Contact quick links -->
								<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[13px] text-slate-500">
									{#if order.phone_number}
										<a href={getWhatsAppHref(order.phone_number)} target="_blank" rel="noopener noreferrer" class="hover:text-emerald-700 font-medium inline-flex items-center gap-1 hover:underline">
											<svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
											{order.phone_number}
										</a>
									{/if}
									{#if order.email}
										<span class="truncate max-w-[180px]">{order.email}</span>
									{/if}
								</div>
							</div>

							<!-- Status Dropdown Form -->
							<OrderStatusSelect order={order} onProofRequired={openDeliveryProof} onUpdated={onProofOrderUpdated} disabled={proofDialogOpen} />
						</div>
						
						<!-- Product & Fulfillment Detail Card -->
						<div class="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100/80 flex flex-col gap-2.5 text-sm text-slate-600">
							<div class="flex justify-between items-start gap-2">
								<div class="font-bold text-slate-800 leading-snug break-words flex-1">
									{order.order_items?.[0]?.product_name || order.product_name || 'Produk Custom'}
									{#if (order.order_items?.length || 0) > 1}
										<span class="text-xs text-slate-500 font-normal block mt-0.5">+ {(order.order_items?.length || 1) - 1} produk lainnya</span>
									{/if}
								</div>
								<span class="font-semibold text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-600 shrink-0 shadow-2xs">
									{order.order_items?.length || 1} item
								</span>
							</div>
							
							<div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-200/60">
								<span>Size: <strong class="text-slate-700 font-semibold">{order.order_items?.[0]?.cake_size || order.cake_size || 'Standard'}</strong></span>
								<button
									type="button"
									onclick={(e) => openScheduleDrawer(order, e)}
									class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 transition-all font-semibold active:scale-[0.96] shadow-2xs group/sched cursor-pointer"
									title="Klik untuk atur ulang tanggal & jam"
								>
									<svg class="w-3.5 h-3.5 text-slate-400 group-hover/sched:text-slate-700 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
									<span>{formatDate(order.delivery_date || order.pickup_date)}{order.delivery_time || order.pickup_time ? ` • ${order.delivery_time || order.pickup_time}` : ''}</span>
									<svg class="w-3 h-3 text-slate-400 opacity-60 group-hover/sched:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
								</button>
							</div>
						</div>
					</Card.Content>

					<!-- Footer Card: Harga & Action -->
					<div class="p-5 pt-0 flex items-center justify-between gap-3">
						<div>
							<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Tagihan</p>
							<p class="font-extrabold text-slate-900 text-lg leading-none whitespace-nowrap">{formatCurrency(order.amount)}</p>
						</div>
						<Button variant="outline" size="sm" class="rounded-xl shadow-xs font-bold border-slate-200 text-slate-800 hover:bg-slate-100 hover:text-slate-900 shrink-0 active:scale-95 transition-all" onclick={() => openDrawer(order)}>
							Kelola Pesanan
						</Button>
					</div>
				</Card.Root>
			{:else}
				<div class="col-span-full flex flex-col items-center justify-center py-16 text-slate-400 bg-white border border-dashed border-slate-200 rounded-3xl">
					<div class="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
						<svg class="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
					</div>
					<p class="font-medium text-slate-600">
						{#if hasActiveFilters}
							Tidak ada pesanan yang sesuai dengan filter.
						{:else}
							Belum ada pesanan yang ditemukan.
						{/if}
					</p>
					<Button size="sm" class="mt-4 rounded-xl active:scale-95 transition-transform font-semibold" onclick={resetFilters}>
						Tampilkan Semua Pesanan
					</Button>
				</div>
			{/each}
		</div>
	{:else}
		<!-- Table View -->
		<div class="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
			<div class="overflow-x-auto">
				<Table.Root class="min-w-[980px]">
					<Table.Header class="bg-slate-50/70 border-b border-slate-200">
						<Table.Row>
							<Table.Head class="font-bold text-slate-700">Order</Table.Head>
							<Table.Head class="font-bold text-slate-700">Pelanggan</Table.Head>
							<Table.Head class="font-bold text-slate-700">Produk</Table.Head>
							<Table.Head class="font-bold text-slate-700">Pengiriman</Table.Head>
							<Table.Head class="font-bold text-slate-700">Total Tagihan</Table.Head>
							<Table.Head class="font-bold text-slate-700">Status</Table.Head>
							<Table.Head class="text-right font-bold text-slate-700">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each filteredOrders as order (order.id)}
							<Table.Row class="hover:bg-slate-50/50 transition-colors">
								<Table.Cell class="font-bold text-slate-800">#{order.order_number}</Table.Cell>
								<Table.Cell>
									<div class="flex max-w-56 flex-col gap-0.5">
										<span class="truncate font-bold text-slate-800">{order.customer_name}</span>
										{#if order.phone_number}
											<a href={getWhatsAppHref(order.phone_number)} target="_blank" rel="noopener noreferrer" class="truncate text-xs text-emerald-700 font-medium hover:underline inline-flex items-center gap-1">
												<svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
										{order.phone_number}
									</a>
										{/if}
										<span class="truncate text-xs text-slate-400">{order.email || 'Email belum diisi'}</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex max-w-56 flex-col gap-0.5">
										<span class="truncate font-semibold text-slate-800">{order.order_items?.[0]?.product_name || order.product_name || 'Produk Custom'}</span>
										<span class="text-xs text-slate-500">
											{order.order_items?.[0]?.cake_size || order.cake_size || 'Standard'} &bull; {order.order_items?.length || 1} item
										</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex flex-col gap-1 items-start">
										<span class="font-semibold text-xs inline-flex items-center gap-1 {getDeliveryOption(order) === 'pickup' ? 'text-amber-700' : 'text-sky-700'}">
											{getDeliveryOptionLabel(order)}
										</span>
										<button
											type="button"
											onclick={(e) => openScheduleDrawer(order, e)}
											class="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-1.5 py-0.5 -mx-1.5 rounded-md transition-all active:scale-[0.96] text-left group/sched cursor-pointer"
											title="Klik untuk atur ulang tanggal & jam"
										>
											<span>{formatDate(order.delivery_date || order.pickup_date)}{order.delivery_time || order.pickup_time ? ` • ${order.delivery_time || order.pickup_time}` : ''}</span>
											<svg class="w-3 h-3 text-slate-400 opacity-60 group-hover/sched:opacity-100 transition-opacity shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
										</button>
									</div>
								</Table.Cell>
								<Table.Cell class="whitespace-nowrap font-bold text-slate-900">{formatCurrency(order.amount)}</Table.Cell>
								<Table.Cell>
									<OrderStatusSelect order={order} onProofRequired={openDeliveryProof} onUpdated={onProofOrderUpdated} disabled={proofDialogOpen} />
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button variant="outline" size="sm" class="rounded-xl font-bold active:scale-95 transition-transform" onclick={() => openDrawer(order)}>Kelola</Button>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={7} class="h-36 text-center text-slate-400">
									<div class="flex flex-col items-center gap-3 py-6">
										<span class="font-medium text-slate-600">{hasActiveFilters ? 'Tidak ada pesanan yang sesuai dengan filter.' : 'Belum ada pesanan yang ditemukan.'}</span>
										<Button size="sm" class="rounded-xl active:scale-95 transition-transform font-semibold" onclick={resetFilters}>
											Tampilkan Semua Pesanan
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	{/if}

	<!-- Pagination -->
	{#if pagination.totalOrders > 0}
		<div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm sm:flex-row sm:items-center sm:justify-between shadow-2xs">
			<p class="text-slate-500 font-medium">Menampilkan <span class="font-bold text-slate-800">{pagination.from}-{pagination.to}</span> dari <span class="font-bold text-slate-800">{pagination.totalOrders}</span> pesanan</p>
			<div class="flex items-center gap-2">
				<Button href={getFilterHref({ page: pagination.page - 1 })} variant="outline" size="sm" disabled={pagination.page <= 1} class="rounded-xl active:scale-95 transition-transform">Sebelumnya</Button>
				<span class="min-w-16 text-center font-bold text-slate-700 text-xs">{pagination.page} / {pagination.totalPages}</span>
				<Button href={getFilterHref({ page: pagination.page + 1 })} variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} class="rounded-xl active:scale-95 transition-transform">Berikutnya</Button>
			</div>
		</div>
	{/if}
</AdminPage>

<!-- BOTTOM SHEET / SIDE DRAWER MODAL ("Kelola Pesanan") -->
{#if isDrawerOpen && selectedOrder}
	<div class="fixed inset-0 z-50 flex flex-col justify-end lg:justify-center items-center pointer-events-auto p-0 lg:p-4">
		<!-- Backdrop -->
		<button class="absolute inset-0 w-full h-full bg-slate-900/50 backdrop-blur-xs cursor-default" transition:fade={{duration: 200}} onclick={closeDrawer} aria-label="Close modal"></button>
		
		<!-- Modal/Drawer Container -->
		<div class="relative bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl p-6 pb-safe-12 w-full max-w-2xl mx-auto flex flex-col max-h-[90vh] z-10 border border-slate-100" transition:fly={{ y: 40, duration: 250, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}>
			<div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4 lg:hidden"></div>
			
			<!-- Drawer Header -->
			<div class="flex justify-between items-start pb-4 border-b border-slate-100">
				<div>
					<div class="flex items-center gap-2 mb-1">
						<span class="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">#{selectedOrder.order_number}</span>
						<span class="text-xs font-bold px-2.5 py-0.5 rounded-full {selectedOrder.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : selectedOrder.status === 'Processing' ? 'bg-sky-100 text-sky-800' : selectedOrder.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
							{orderStatusLabel(selectedOrder.status)}
						</span>
						{#if loadingDetail}
							<span class="inline-flex items-center gap-1 text-[11px] text-slate-400 animate-pulse">
								<svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
								Memuat detail...
							</span>
						{/if}
					</div>
					<h3 class="text-xl font-bold text-slate-900 leading-tight">{selectedOrder.customer_name}</h3>
					<p class="text-xs text-slate-400 mt-0.5">Dipesan pada {formatDate(selectedOrder.created_at)}</p>
				</div>
				<button onclick={closeDrawer} aria-label="Tutup modal" class="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors active:scale-90">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>

			<!-- Drawer Scrollable Body -->
			<div class="space-y-6 overflow-y-auto py-5 px-1 flex-1 pr-2">
				<!-- Section 1: Customer Contact & Fulfillment -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
					<!-- Customer Contact Card -->
					<div class="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
						<Label class="text-slate-800 font-bold text-xs uppercase tracking-wider mb-2 block">Kontak Pelanggan</Label>
						<div class="space-y-2 text-xs">
							<div>
								<span class="text-slate-400 block mb-0.5">WhatsApp</span>
								{#if selectedOrder.phone_number}
									<a href={getWhatsAppHref(selectedOrder.phone_number)} target="_blank" rel="noopener noreferrer" class="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
										<svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
										{selectedOrder.phone_number} &rarr; Chat
									</a>
								{:else}
									<span class="text-slate-500 font-medium">-</span>
								{/if}
							</div>
							<div>
								<span class="text-slate-400 block mb-0.5">Email</span>
								{#if selectedOrder.email}
									<a href="mailto:{selectedOrder.email}" class="font-bold text-slate-700 hover:underline">{selectedOrder.email}</a>
								{:else}
									<span class="text-slate-400 italic">Belum diisi</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Fulfillment Card -->
					<div class="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
						<div class="flex items-center justify-between mb-2">
							<Label class="text-slate-800 font-bold text-xs uppercase tracking-wider">Pengiriman / Pickup</Label>
							<div class="flex items-center gap-1.5">
								<span class="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider {getDeliveryOption(selectedOrder) === 'pickup' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}">
									{getDeliveryOptionLabel(selectedOrder)}
								</span>
								<button
									type="button"
									onclick={() => openScheduleDrawer(selectedOrder)}
									class="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg shadow-2xs active:scale-95 transition-all inline-flex items-center gap-1 cursor-pointer"
								>
									<svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
									Ubah Jadwal
								</button>
							</div>
						</div>
						<div class="space-y-1 text-xs text-slate-600">
							<p><span class="text-slate-400">Jadwal:</span> <strong class="text-slate-800 font-bold">{formatDate(selectedOrder.delivery_date || selectedOrder.pickup_date)}</strong> {selectedOrder.delivery_time || selectedOrder.pickup_time ? `pk. ${selectedOrder.delivery_time || selectedOrder.pickup_time}` : ''}</p>
							{#if getDeliveryOption(selectedOrder) === 'delivery'}
								<p class="whitespace-pre-line mt-1"><span class="text-slate-400">Alamat:</span> <span class="text-slate-800 font-medium">{selectedOrder.address || '-'}</span></p>
							{:else}
								<p class="text-amber-800 font-medium bg-amber-50/50 p-1.5 rounded-lg border border-amber-200/50 mt-1">Pelanggan memilih Ambil Sendiri (Pickup) di toko.</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Section 2: Items & Customizations Breakdown -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<Label class="text-slate-900 font-bold text-sm">Daftar Item & Kustomisasi</Label>
						<span class="text-xs text-slate-400 font-medium">{selectedOrder.order_items?.length || 1} produk</span>
					</div>

					<div class="space-y-3">
						{#each selectedOrder.order_items || [] as item, idx (item.id || idx)}
							<div class="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3">
								<div class="flex items-start justify-between gap-2">
									<div>
										<h4 class="font-bold text-slate-900 text-base leading-tight">{item.product_name || item.products?.name || 'Produk'}</h4>
										<p class="text-xs text-slate-500 mt-0.5">
											{item.quantity}x &bull; Ukuran: <strong class="text-slate-800 font-semibold">{item.cake_size || item.variant_name || 'Standard'}</strong>
										</p>
									</div>
									<span class="font-extrabold text-sm text-slate-900 whitespace-nowrap bg-white px-2.5 py-1 rounded-lg border border-slate-200">
										{formatCurrency(item.estimated_subtotal || item.size_price || selectedOrder.amount)}
									</span>
								</div>

								<!-- Addons & Option Tags Grid -->
								{#if item.customized_options}
									<div class="flex flex-wrap gap-1.5 pt-1">
										{#if item.customized_options.flavor?.name || item.cake_flavor}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
												<span class="text-slate-400 font-normal">Rasa:</span>
												<span>{item.customized_options.flavor?.name || item.cake_flavor}</span>
											</span>
										{/if}

										{#if item.customized_options.color?.name || item.cake_color}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
												<span class="text-slate-400 font-normal">Warna:</span>
												<span>{item.customized_options.color?.name || item.cake_color}</span>
											</span>
										{/if}

										{#if item.customized_options.crown?.name || item.crown_option}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
												<span class="text-slate-400 font-normal">Mahkota:</span>
												<span>{item.customized_options.crown?.name || item.crown_option}</span>
											</span>
										{/if}

										{#if item.customized_options.glitter?.name || item.add_edible_glitter}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
												<span class="text-slate-400 font-normal">Glitter:</span>
												<span>{item.customized_options.glitter?.name || item.add_edible_glitter}</span>
											</span>
										{/if}

										{#if item.customized_options.cake_topper?.selected || item.has_cake_topper}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
												<span class="text-slate-400 font-normal">Topper:</span>
												<span>{item.customized_options.cake_topper?.name || 'Ya'}</span>
												{#if Number(item.cake_topper_fee) > 0}
													<span class="text-emerald-600 font-bold">+{formatCurrency(item.cake_topper_fee)}</span>
												{/if}
											</span>
										{/if}

										{#each item.customized_options.addons || [] as addon (addon.addon_id || addon.name)}
											<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
												<span class="text-slate-400 font-normal">{addon.category || 'Addon'}:</span>
												<span>{addon.name}</span>
												{#if Number(addon.price) > 0}
													<span class="text-emerald-600 font-bold">+{formatCurrency(addon.price)}</span>
												{/if}
											</span>
										{/each}
									</div>
								{/if}

								<!-- Cake Inscription Box -->
								{#if item.cake_text || item.customized_options?.cake_text}
									<div class="rounded-xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-950">
										<p class="font-bold text-[10px] uppercase tracking-wider text-amber-800 mb-0.5">Tulisan di Kue</p>
										<p class="font-medium italic">"{item.cake_text || item.customized_options?.cake_text}"</p>
									</div>
								{/if}

								<!-- Gift Card Inscription Box -->
								{#if item.gift_card_text || item.customized_options?.gift_card_text}
									<div class="rounded-xl bg-purple-50/80 border border-purple-200/80 p-3 text-xs text-purple-950">
										<p class="font-bold text-[10px] uppercase tracking-wider text-purple-800 mb-0.5">Pesan Kartu Ucapan</p>
										<p class="font-medium italic">"{item.gift_card_text || item.customized_options?.gift_card_text}"</p>
									</div>
								{/if}

								<!-- Reference Image Link -->
								{#if item.reference_image_url}
									<div class="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
										<img src={item.reference_image_url} alt="Referensi Desain" class="w-12 h-12 rounded-lg object-cover border border-slate-100 shrink-0" />
										<div class="min-w-0 flex-1">
											<p class="text-xs font-bold text-slate-800">Foto Referensi Pelanggan</p>
											<a href={item.reference_image_url} target="_blank" rel="noopener noreferrer" class="text-xs text-primary-600 font-semibold hover:underline inline-flex items-center gap-1 mt-0.5">
												Lihat Foto Ukuran Penuh &rarr;
											</a>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<hr class="border-slate-100" />

				<!-- Section 3: Status Changer -->
				<div class="space-y-3">
					<Label class="text-slate-900 font-bold text-sm">Status Pesanan</Label>
					<OrderStatusSelect order={selectedOrder} onProofRequired={openDeliveryProof} onUpdated={onProofOrderUpdated} disabled={proofDialogOpen} />
				</div>

				<hr class="border-slate-100" />

				<DeliveryProofGallery order={selectedOrder} onReplace={openDeliveryProof} disabled={proofDialogOpen} />

				<!-- Section 4: Billing & Delivery Fee Form -->
				<div class="space-y-4">
					<Label class="text-slate-900 font-bold text-sm">Kelola Tagihan & Biaya Pengiriman</Label>
					<form method="POST" action="?/updateAmount" use:enhance={() => {
						return async ({ update }) => {
							await update();
							closeDrawer();
						};
					}} class="flex flex-col gap-4">
						<input type="hidden" name="id" value={selectedOrder.id} />
						
						<div class="space-y-1.5">
							<Label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Harga Total Kue</Label>
							<PriceInput name="cake_price" placeholder="0" bind:value={draftCakePrice} class="w-full h-12 text-sm font-bold text-slate-800 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-slate-900 shadow-inner" />
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div class="space-y-1.5">
								<Label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Biaya Ongkir</Label>
								<PriceInput name="delivery_fee" placeholder="0" bind:value={draftDeliveryFee} class="w-full h-12 text-sm font-bold text-slate-800 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-slate-900 shadow-inner" />
							</div>
							<div class="space-y-1.5">
								<Label class="text-xs font-bold text-slate-500 uppercase tracking-wide">Kendaraan</Label>
								<select name="delivery_vehicle" bind:value={draftDeliveryVehicle} class="w-full h-12 px-3 text-sm font-bold text-slate-800 rounded-xl bg-slate-50 border border-slate-200 focus-visible:ring-slate-900 shadow-inner">
									<option value="Bike">Motor (Bike)</option>
									<option value="Car">Mobil (Car)</option>
								</select>
							</div>
						</div>

						<!-- Total Calculation Banner -->
						<div class="bg-amber-50/90 p-4 rounded-2xl border border-amber-200/70 mt-1 flex justify-between items-center">
							<div>
								<span class="text-xs font-bold text-amber-800 uppercase tracking-wider block">Total Tagihan Final</span>
								<span class="text-xs text-amber-700/80">Kue + Ongkos Kirim</span>
							</div>
							<span class="text-2xl font-black text-amber-900">{formatCurrency(calculatedTotal)}</span>
							<input type="hidden" name="amount" value={calculatedTotal} />
						</div>

						<Button type="submit" class="w-full h-13 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all text-sm font-bold shadow-md shadow-slate-900/10">
							Simpan Tagihan
						</Button>
					</form>
				</div>

				<hr class="border-slate-100" />

				<!-- Section 5: Payment Proof Upload -->
				<div class="space-y-3">
					<Label class="text-slate-900 font-bold text-sm">Bukti Pembayaran Transfer</Label>
					
					{#if selectedOrder.proof_of_transfer}
						<div class="flex items-center justify-between p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl">
							<span class="text-xs font-bold text-emerald-800 flex items-center gap-2">
								<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
								Bukti Pembayaran Tersimpan
							</span>
							<a href={selectedOrder.proof_of_transfer} target="_blank" rel="noopener noreferrer" class="text-xs text-emerald-800 hover:text-emerald-950 underline font-bold px-3 py-1.5 bg-emerald-100 rounded-lg transition-colors">
								Lihat Foto &rarr;
							</a>
						</div>
					{/if}
					
					<form method="POST" action="?/uploadReceipt" enctype="multipart/form-data" use:enhance={() => {
						uploadingReceipt = true;
						return async ({ update }) => {
							await update();
							closeDrawer();
						};
					}} class="flex flex-col gap-2">
						<input type="hidden" name="id" value={selectedOrder.id} />
						<label class="w-full h-24 border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden group">
							{#if uploadingReceipt}
								<div class="flex flex-col items-center text-slate-500 font-medium animate-pulse">
									<svg class="w-5 h-5 mb-1 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
									<span class="text-xs">Mengunggah bukti...</span>
								</div>
							{:else}
								<div class="flex items-center gap-2.5 text-slate-600 font-semibold group-hover:text-slate-800 text-xs">
									<div class="w-8 h-8 bg-white rounded-full shadow-2xs flex items-center justify-center border border-slate-200 group-hover:scale-105 transition-transform">
										<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
									</div>
									<span>Ambil Foto / Upload Bukti Transfer Baru</span>
								</div>
							{/if}
							<input type="file" name="receipt" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full disabled:cursor-not-allowed" disabled={uploadingReceipt} onchange={(e) => {
								if (e.currentTarget.files && e.currentTarget.files.length > 0) {
									e.currentTarget.form.requestSubmit();
								}
							}} />
						</label>
					</form>
				</div>

				<hr class="border-slate-100" />

				<!-- Section 6: Direct Invoicing -->
				<div class="space-y-3">
					<Label class="text-slate-900 font-bold text-sm">Kirim Tagihan / Invoice</Label>
					
					{#if invoiceStatus}
						<div class="p-3 rounded-xl text-xs font-medium {invoiceStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}">
							{invoiceStatus.success ? '✅' : '❌'} {invoiceStatus.message}
						</div>
					{/if}

					{#if emailInvoiceStatus}
						<div class="p-3 rounded-xl text-xs font-medium {emailInvoiceStatus.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}">
							{emailInvoiceStatus.success ? '✅' : '❌'} {emailInvoiceStatus.message}
						</div>
					{/if}

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
						<Button 
							onclick={() => sendInvoice(selectedOrder.id)} 
							disabled={sendingInvoice}
							class="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-xs font-bold shadow-xs gap-2"
						>
							{#if sendingInvoice}
								<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
								Mengirim...
							{:else}
								<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
								Kirim via WhatsApp
							{/if}
						</Button>

						<Button 
							onclick={() => sendEmailInvoice(selectedOrder.id)} 
							disabled={sendingEmailInvoice || !selectedOrder.email}
							variant="outline"
							class="w-full h-12 rounded-xl border-slate-200 text-slate-800 hover:bg-slate-50 active:scale-[0.98] transition-all text-xs font-bold gap-2 disabled:opacity-50"
						>
							{#if sendingEmailInvoice}
								<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
								Mengirim...
							{:else}
								<svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2z"></path></svg>
								Kirim via Email
							{/if}
						</Button>
					</div>
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

<!-- BOTTOM SHEET DRAWER FOR CREATE MANUAL ORDER -->
{#if isCreateOrderDrawerOpen}
	<div class="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
		<button
			type="button"
			class="absolute inset-0 size-full bg-slate-900/40 backdrop-blur-xs cursor-default"
			transition:fade={{ duration: 200 }}
			onclick={closeCreateOrderDrawer}
			aria-label="Tutup drawer"
		></button>

		<div
			class="relative mx-auto flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-3xl bg-card p-6 shadow-2xl pb-safe-10 border-t border-border"
			transition:fly={{ y: '100%', duration: 320, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}
		>
			{#if isCreatingOrder}
				<Loading
					variant="overlay"
					label="Membuat pesanan manual..."
					description="Mohon tunggu, pesanan sedang divalidasi dan disimpan ke sistem."
					class="rounded-t-3xl"
				/>
			{/if}

			<div class="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"></div>

			<div class="mb-5 flex items-start justify-between shrink-0">
				<div>
					<h3 class="text-xl font-bold text-foreground">Tambah Pesanan Manual</h3>
					<p class="text-xs text-muted-foreground">
						Buat pesanan langsung dari panel admin untuk pesanan offline, WhatsApp, atau walk-in customer.
					</p>
				</div>
				<button
					type="button"
					onclick={closeCreateOrderDrawer}
					class="rounded-full bg-muted p-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
					aria-label="Tutup"
				>
					✕
				</button>
			</div>

			<div class="flex-1 overflow-y-auto pr-1">
				<form
					method="POST"
					action="?/createOrder"
					use:enhance={() => {
						isCreatingOrder = true;
						return async ({ update, result }) => {
							try {
								await update();
								if (result.type === 'success') {
									closeCreateOrderDrawer();
								}
							} finally {
								isCreatingOrder = false;
							}
						};
					}}
					class="space-y-6"
				>
					<!-- 1. DATA PEMESAN -->
					<div class="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
						<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">1. Data Pemesan</h4>
						
						<div class="grid gap-3 sm:grid-cols-2">
							<div class="space-y-1.5">
								<Label for="order_customer_name" class="font-bold text-foreground">Nama Pelanggan *</Label>
								<Input
									id="order_customer_name"
									name="customerName"
									type="text"
									bind:value={newCustomerName}
									placeholder="Contoh: Budi Santoso"
									required
									class="h-10 rounded-xl"
								/>
							</div>

							<div class="space-y-1.5">
								<Label for="order_phone_number" class="font-bold text-foreground">No. Telepon / WhatsApp *</Label>
								<Input
									id="order_phone_number"
									name="phoneNumber"
									type="tel"
									bind:value={newPhoneNumber}
									placeholder="081234567890"
									required
									class="h-10 rounded-xl"
								/>
							</div>

							<div class="space-y-1.5 sm:col-span-2">
								<Label for="order_email" class="font-bold text-foreground">Email (Opsional)</Label>
								<Input
									id="order_email"
									name="email"
									type="email"
									bind:value={newEmail}
									placeholder="customer@example.com"
									class="h-10 rounded-xl"
								/>
								<p class="text-[11px] text-muted-foreground">Digunakan jika ingin mengirim nota & invoice via email otomatis.</p>
							</div>
						</div>
					</div>

					<!-- 2. PILIHAN PRODUK & KUSTOMISASI -->
					<div class="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
						<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">2. Produk & Kustomisasi</h4>

						<div class="grid gap-3 sm:grid-cols-2">
							<!-- SELECT PRODUCT -->
							<div class="space-y-1.5 sm:col-span-2">
								<Label for="order_product" class="font-bold text-foreground">Pilih Produk *</Label>
								<select
									id="order_product"
									name="productId"
									bind:value={newProductId}
									onchange={() => {
										newProductVariantId = '';
										newOrderAddonCategory = 'all';
									}}
									required
									class="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<option value="" disabled>-- Pilih Produk Katalog --</option>
									{#each products as p}
										<option value={p.id}>{p.name} - {formatCurrency(p.base_price || p.price)}</option>
									{/each}
								</select>
							</div>

							<!-- SELECT VARIANT (IF ANY) -->
							{#if productVariants.length > 0}
								<div class="space-y-1.5">
									<Label for="order_variant" class="font-bold text-foreground">Ukuran / Varian</Label>
									<select
										id="order_variant"
										name="productVariantId"
										bind:value={newProductVariantId}
										class="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
									>
										<option value="">Default ({formatCurrency(selectedProduct?.base_price || selectedProduct?.price)})</option>
										{#each productVariants as v}
											<option value={v.id}>{v.name} - {formatCurrency(v.price)}</option>
										{/each}
									</select>
								</div>
							{/if}

							<!-- QUANTITY -->
							<div class="space-y-1.5 {productVariants.length === 0 ? 'sm:col-span-2' : ''}">
								<Label for="order_quantity" class="font-bold text-foreground">Jumlah (Qty)</Label>
								<Input
									id="order_quantity"
									name="quantity"
									type="number"
									min="1"
									bind:value={newQuantity}
									required
									class="h-10 rounded-xl"
								/>
							</div>

							<!-- ADDONS SECTION -->
							{#if globalAddons.length > 0 || (selectedProduct?.addons && selectedProduct.addons.length > 0)}
								<div class="space-y-3 sm:col-span-2 pt-2 border-t border-border/60">
									<!-- Header: Title, Count Badge, Scope Toggle -->
									<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<div class="flex items-center gap-2">
												<Label class="font-bold text-foreground text-sm">Pilihan Addon / Topping Tambahan</Label>
												{#if newSelectedAddonIds.length > 0}
													<span class="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
														{newSelectedAddonIds.length} Dipilih (+{formatCurrency(addonsUnitPrice)}/item)
													</span>
												{/if}
											</div>
											<p class="text-[11px] text-muted-foreground mt-0.5">
												Pilih addon atau dekorasi khusus yang ditambahkan ke pesanan ini.
											</p>
										</div>

										<!-- If product has customized addons, show toggle between Product Addons & All Global Addons -->
										{#if hasProductSpecificAddons}
											<div class="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-semibold">
												<button
													type="button"
													class={cn(
														'rounded-md px-2.5 py-1 transition-all cursor-pointer',
														newOrderAddonScope === 'product'
															? 'bg-background text-foreground shadow-2xs font-bold'
															: 'text-muted-foreground hover:text-foreground'
													)}
													onclick={() => {
														newOrderAddonScope = 'product';
														newOrderAddonCategory = 'all';
													}}
												>
													Addon Produk ({selectedProduct.addons.length})
												</button>
												<button
													type="button"
													class={cn(
														'rounded-md px-2.5 py-1 transition-all cursor-pointer',
														newOrderAddonScope === 'all'
															? 'bg-background text-foreground shadow-2xs font-bold'
															: 'text-muted-foreground hover:text-foreground'
													)}
													onclick={() => {
														newOrderAddonScope = 'all';
														newOrderAddonCategory = 'all';
													}}
												>
													Semua Global ({globalAddons.length})
												</button>
											</div>
										{/if}
									</div>

									<!-- Search & Quick Action Toolbar -->
									<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
										<div class="flex-1 min-w-0">
											<AdminSearchField
												bind:value={newOrderAddonSearch}
												placeholder="Cari nama addon / kategori..."
												label="Cari addon pesanan"
												class="h-9 text-xs"
											/>
										</div>
										<div class="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
											{#if visibleOrderAddons.length > 0}
												<button
													type="button"
													class="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-95 transition-all cursor-pointer"
													onclick={selectAllVisibleAddons}
												>
													<Check class="size-3.5 text-primary" />
													<span>Pilih Semua</span>
												</button>
											{/if}
											{#if newSelectedAddonIds.length > 0}
												<button
													type="button"
													class="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-95 transition-all cursor-pointer"
													onclick={clearAllSelectedAddons}
												>
													<RotateCcw class="size-3 text-muted-foreground" />
													<span>Kosongkan ({newSelectedAddonIds.length})</span>
												</button>
											{/if}
										</div>
									</div>

									<!-- Category Filter Tabs (Pills) -->
									{#if addonCategories.length > 0}
										<div class="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
											<button
												type="button"
												class={cn(
													'shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer',
													newOrderAddonCategory === 'all'
														? 'bg-primary text-primary-foreground shadow-2xs'
														: 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
												)}
												onclick={() => (newOrderAddonCategory = 'all')}
											>
												Semua ({effectiveAddonPool.length})
											</button>
											{#each addonCategories as cat}
												{@const catCount = effectiveAddonPool.filter((a) => (a.category || '').trim().toLowerCase() === cat.toLowerCase()).length}
												<button
													type="button"
													class={cn(
														'shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all capitalize cursor-pointer',
														newOrderAddonCategory.toLowerCase() === cat.toLowerCase()
															? 'bg-primary text-primary-foreground shadow-2xs'
															: 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
													)}
													onclick={() => (newOrderAddonCategory = cat)}
												>
													{cat} ({catCount})
												</button>
											{/each}
										</div>
									{/if}

									<!-- Addons List Grid -->
									<div class="grid gap-2 sm:grid-cols-2 max-h-56 overflow-y-auto pr-1">
										{#each visibleOrderAddons as addon (addon.id)}
											{@const isChecked = newSelectedAddonIds.includes(addon.id)}
											{@const price = addon.additional_price ?? addon.price ?? addon.additionalPrice ?? 0}
											<label
												class={cn(
													'group flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-xs transition-all cursor-pointer select-none',
													isChecked
														? 'border-primary bg-primary/5 text-foreground font-semibold shadow-2xs ring-1 ring-primary/20'
														: 'border-border/70 bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/30'
												)}
											>
												<div class="flex items-center gap-2.5 min-w-0">
													<input
														type="checkbox"
														checked={isChecked}
														onchange={() => toggleNewOrderAddon(addon.id)}
														class="size-4 rounded border-border text-primary focus:ring-primary shrink-0"
													/>
													<div class="min-w-0 flex flex-col">
														<span class="truncate text-foreground font-medium group-hover:text-primary transition-colors">{addon.name}</span>
														{#if addon.category && (newOrderAddonCategory === 'all' || newOrderAddonSearch)}
															<span class="text-[10px] text-muted-foreground capitalize truncate">{addon.category}</span>
														{/if}
													</div>
												</div>
												<div class="flex items-center gap-1.5 shrink-0">
													{#if addon.is_dark_color}
														<span class="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">Warna Gelap</span>
													{/if}
													<span class="font-bold text-primary text-xs">
														{price > 0 ? `+${formatCurrency(price)}` : 'Gratis'}
													</span>
												</div>
											</label>
										{:else}
											<div class="sm:col-span-2 py-6 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-xl">
												<p class="text-xs font-semibold">Tidak ada addon yang cocok.</p>
												{#if newOrderAddonSearch}
													<button
														type="button"
														class="mt-1.5 text-xs text-primary underline font-medium cursor-pointer"
														onclick={() => (newOrderAddonSearch = '')}
													>
														Hapus kata pencarian
													</button>
												{/if}
											</div>
										{/each}
									</div>

									<!-- Hidden inputs for all selected addon IDs so search/filter doesn't lose checked values on submit -->
									{#each newSelectedAddonIds as id}
										<input type="hidden" name="selectedAddonIds" value={id} />
									{/each}
								</div>
							{/if}

							<!-- CAKE TEXT -->
							<div class="space-y-1.5 sm:col-span-2">
								<Label for="order_cake_text" class="font-bold text-foreground">Tulisan di Kue (Opsional)</Label>
								<Input
									id="order_cake_text"
									name="cakeText"
									type="text"
									bind:value={newCakeText}
									placeholder="Contoh: Happy Birthday Sarah ke-25"
									class="h-10 rounded-xl"
								/>
							</div>

							<!-- GIFT CARD TEXT -->
							<div class="space-y-1.5 sm:col-span-2">
								<Label for="order_gift_card" class="font-bold text-foreground">Kartu Ucapan (Opsional)</Label>
								<Input
									id="order_gift_card"
									name="giftCardText"
									type="text"
									bind:value={newGiftCardText}
									placeholder="Pesan ucapan singkat..."
									class="h-10 rounded-xl"
								/>
							</div>
						</div>
					</div>

					<!-- 3. PENGIRIMAN & WAKTU -->
					<div class="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
						<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">3. Pengiriman & Jadwal</h4>

						<!-- DELIVERY OPTION TOGGLE -->
						<div class="flex rounded-xl bg-muted p-1">
							<button
								type="button"
								class={cn(
									'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all',
									newDeliveryOption === 'delivery'
										? 'bg-background text-foreground shadow-xs'
										: 'text-muted-foreground hover:text-foreground'
								)}
								onclick={() => (newDeliveryOption = 'delivery')}
							>
								<Truck class="size-4 text-primary" />
								<span>Delivery (Antar)</span>
							</button>

							<button
								type="button"
								class={cn(
									'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all',
									newDeliveryOption === 'pickup'
										? 'bg-background text-foreground shadow-xs'
										: 'text-muted-foreground hover:text-foreground'
								)}
								onclick={() => (newDeliveryOption = 'pickup')}
							>
								<Store class="size-4 text-primary" />
								<span>Pickup (Ambil Sendiri)</span>
							</button>
						</div>
						<input type="hidden" name="deliveryOption" value={newDeliveryOption} />

						<div class="grid gap-3 sm:grid-cols-2">
							<!-- ADDRESS (REQUIRED IF DELIVERY) -->
							{#if newDeliveryOption === 'delivery'}
								<div class="space-y-1.5 sm:col-span-2">
									<Label for="order_address" class="font-bold text-foreground">Alamat Lengkap Pengiriman *</Label>
									<textarea
										id="order_address"
										name="address"
										bind:value={newAddress}
										placeholder="Jl. Mawar No. 12, RT 01/RW 02, Jakarta Selatan..."
										required
										rows="2"
										class="w-full rounded-xl border border-input bg-background p-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
									></textarea>
								</div>

								<!-- VEHICLE -->
								<div class="space-y-1.5 sm:col-span-2">
									<Label for="order_vehicle" class="font-bold text-foreground">Kendaraan Pengiriman</Label>
									<select
										id="order_vehicle"
										name="deliveryVehicle"
										bind:value={newDeliveryVehicle}
										class="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
									>
										<option value="Motor">Motor (Kurir Motor)</option>
										<option value="Mobil">Mobil (Kurir Mobil / GrabCar)</option>
									</select>
								</div>
							{:else}
								<div class="space-y-1.5 sm:col-span-2">
									<Label for="order_pickup_note" class="font-bold text-foreground">Catatan Pickup</Label>
									<Input
										id="order_pickup_note"
										name="address"
										bind:value={newAddress}
										placeholder="Ambil langsung di toko (opsional)"
										class="h-10 rounded-xl"
									/>
								</div>
							{/if}

							<!-- DATE -->
							<div class="space-y-1.5">
								<Label for="order_date" class="font-bold text-foreground">
									{newDeliveryOption === 'delivery' ? 'Tanggal Kirim *' : 'Tanggal Pickup *'}
								</Label>
								<Input
									id="order_date"
									name="deliveryDate"
									type="date"
									bind:value={newDeliveryDate}
									required
									class="h-10 rounded-xl"
								/>
							</div>

							<!-- TIME -->
							<div class="space-y-1.5">
								<Label for="order_time" class="font-bold text-foreground">
									{newDeliveryOption === 'delivery' ? 'Jam Kirim (Est)' : 'Jam Pickup'}
								</Label>
								<Input
									id="order_time"
									name="deliveryTime"
									type="text"
									bind:value={newDeliveryTime}
									placeholder="Contoh: 14:00"
									class="h-10 rounded-xl"
								/>
							</div>
						</div>
					</div>

					<!-- 4. RINCIAN BIAYA & STATUS -->
					<div class="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
						<h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">4. Biaya & Status</h4>

						<div class="grid gap-3 sm:grid-cols-2">
							<!-- STATUS -->
							<div class="space-y-1.5">
								<Label for="order_status" class="font-bold text-foreground">Status Awal</Label>
								<select
									id="order_status"
									name="status"
									bind:value={newStatus}
									class="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								>
									<option value="Pending">Pending (Menunggu Pembayaran)</option>
									<option value="Processing">Diproses (Sedang Dikerjakan)</option>
									{#if newDeliveryOption === 'pickup'}<option value="Completed">Selesai</option>{/if}
								</select>
							</div>

							<!-- CAKE PRICE -->
							<div class="space-y-1.5">
								<Label for="order_cake_price" class="font-bold text-foreground">
									Harga Kue (Subtotal)
								</Label>
								<PriceInput
									id="order_cake_price"
									name="cakePrice"
									bind:value={effectiveCakePrice}
									placeholder="0"
								/>
								<p class="text-[10px] text-muted-foreground">Auto-kalkulasi dari katalog & addon. Dapat diubah manual jika diskon/custom.</p>
							</div>

							<!-- DELIVERY FEE -->
							{#if newDeliveryOption === 'delivery'}
								<div class="space-y-1.5">
									<Label for="order_delivery_fee" class="font-bold text-foreground">Ongkos Kirim</Label>
									<PriceInput
										id="order_delivery_fee"
										name="deliveryFee"
										bind:value={newDeliveryFee}
										placeholder="0"
									/>
								</div>
							{:else}
								<input type="hidden" name="deliveryFee" value="0" />
							{/if}

							<!-- TOTAL AMOUNT DISPLAY -->
							<div class="space-y-1.5 sm:col-span-2 rounded-xl bg-card border border-border p-3 flex items-center justify-between">
								<div>
									<span class="text-xs text-muted-foreground block">Total Akhir Pesanan:</span>
									<span class="text-lg font-extrabold text-primary">{formatCurrency(calculatedFinalAmount)}</span>
								</div>
								<input type="hidden" name="amount" value={calculatedFinalAmount} />
							</div>

							<!-- SEND CONFIRMATION EMAIL CHECKBOX -->
							<div class="sm:col-span-2 pt-1">
								<label class="flex items-center gap-2.5 text-xs text-foreground font-medium cursor-pointer">
									<input
										type="checkbox"
										name="sendConfirmationEmail"
										bind:checked={newSendConfirmationEmail}
										class="size-4 rounded border-border text-primary focus:ring-primary"
									/>
									<span>Kirim email konfirmasi otomatis bila email pemesan diisi</span>
								</label>
							</div>
						</div>
					</div>

					<!-- SUBMIT BUTTON -->
					<div class="sticky bottom-0 bg-card pt-3 border-t border-border">
						<Button
							type="submit"
							disabled={isCreatingOrder || !newCustomerName.trim() || !newPhoneNumber.trim() || !newProductId}
							class="w-full h-11 font-bold text-sm"
						>
							{#if isCreatingOrder}
								<Loading label="Membuat pesanan..." size="sm" class="text-primary-foreground" />
							{:else}
								Simpan & Buat Pesanan Manual
							{/if}
						</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}



{#if proofOrder}
	<DeliveryProofDialog bind:open={proofDialogOpen} order={proofOrder} targetStatus={proofTargetStatus} onUpdated={onProofOrderUpdated} />
{/if}
