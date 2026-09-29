<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, untrack } from 'svelte';
	import Activity from '@lucide/svelte/icons/activity';
	import Calendar from '@lucide/svelte/icons/calendar';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Clock from '@lucide/svelte/icons/clock';
	import Filter from '@lucide/svelte/icons/filter';
	import History from '@lucide/svelte/icons/history';
	import Image from '@lucide/svelte/icons/image';
	import Info from '@lucide/svelte/icons/info';
	import List from '@lucide/svelte/icons/list';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import Package from '@lucide/svelte/icons/package';
	import PlusCircle from '@lucide/svelte/icons/plus-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Store from '@lucide/svelte/icons/store';
	import Tags from '@lucide/svelte/icons/tags';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import User from '@lucide/svelte/icons/user';

	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Table from '$lib/components/ui/table';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminSearchField from '$lib/components/admin/AdminSearchField.svelte';
	import AdminViewToggle from '$lib/components/admin/AdminViewToggle.svelte';
	import { getDashboardDateRange } from '$lib/admin-order-dates.js';
	import { ACTION_MENUS, groupLogsByDate } from '$lib/action-logs.js';
	import { cn } from '$lib/utils';

	let { data } = $props();

	// State
	let refreshing = $state(false);
	let viewMode = $state('list'); // 'list' (timeline) | 'card' (table)
	let searchQuery = $state(untrack(() => data.filters.q));
	let menuFilter = $state(untrack(() => data.filters.menu));
	let dateMode = $state('all');
	let customStart = $state(untrack(() => data.filters.start));
	let customEnd = $state(untrack(() => data.filters.end));
	let startDate = $state(untrack(() => data.filters.start));
	let endDate = $state(untrack(() => data.filters.end));
	let searchTimer;

	let logs = $derived(data.logs || []);
	let pagination = $derived(data.pagination || {});
	let groupedLogs = $derived(groupLogsByDate(logs));

	let hasActiveFilters = $derived(
		Boolean(searchQuery || menuFilter !== 'All' || dateMode !== 'all')
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
		menuFilter = data.filters.menu;
		customStart = data.filters.start;
		customEnd = data.filters.end;
		startDate = data.filters.start;
		endDate = data.filters.end;
		dateMode = inferDateMode(data.filters.start, data.filters.end, data.filters.today);
	});

	function getFilterHref(overrides = {}) {
		const values = {
			q: searchQuery,
			menu: menuFilter,
			start: startDate,
			end: endDate,
			page: 1,
			...overrides
		};

		const params = new URLSearchParams();
		if (values.q) params.set('q', values.q);
		if (values.menu !== 'All') params.set('menu', values.menu);
		if (values.start) params.set('start', values.start);
		if (values.end) params.set('end', values.end);
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
		searchTimer = setTimeout(() => navigateFilters({ q: value, page: 1 }), 300);
	}

	function changeDateMode(mode) {
		dateMode = mode;
		if (mode === 'all') {
			startDate = '';
			endDate = '';
			navigateFilters({ start: '', end: '', page: 1 });
			return;
		}

		const range = getDashboardDateRange(mode, data.filters.today, customStart || data.filters.today, customEnd || data.filters.today);
		startDate = range.start;
		endDate = range.end;
		navigateFilters({ start: range.start, end: range.end, page: 1 });
	}

	function changeCustomRange(start, end) {
		startDate = start;
		endDate = end;
		navigateFilters({ start, end, page: 1 });
	}

	function resetFilters() {
		searchQuery = '';
		menuFilter = 'All';
		dateMode = 'all';
		customStart = '';
		customEnd = '';
		startDate = '';
		endDate = '';
		navigateFilters({ q: '', menu: 'All', start: '', end: '', page: 1 });
	}

	async function handleRefresh() {
		refreshing = true;
		await invalidateAll();
		refreshing = false;
	}

	onDestroy(() => clearTimeout(searchTimer));
</script>

<AdminPage class="max-w-6xl">
	<AdminPageHeader
		eyebrow="Audit & Keamanan"
		title="Log Aktivitas Admin"
		description="Pantau riwayat aktivitas penambahan, perubahan, dan penghapusan data oleh akun admin toko."
	>
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<AdminViewToggle bind:value={viewMode} />
				<Button
					type="button"
					variant="outline"
					disabled={refreshing}
					onclick={handleRefresh}
					class="gap-1.5 transition-transform duration-150 active:scale-[0.98]"
				>
					{#if refreshing}
						<Spinner data-icon="inline-start" /> Memuat...
					{:else}
						<RefreshCw class="size-4" /> Segarkan
					{/if}
				</Button>
			</div>
		{/snippet}
	</AdminPageHeader>

	<!-- FORBIDDEN / PERMISSION ALERT -->
	{#if data.isForbidden}
		<Alert.Root variant="destructive" class="border-destructive/30 bg-destructive/5">
			<ShieldAlert class="size-5 text-destructive" />
			<Alert.Title class="text-base font-bold">Akses Ditolak (Super Admin Only)</Alert.Title>
			<Alert.Description class="text-sm">
				{data.error}
			</Alert.Description>
		</Alert.Root>
	{:else if data.error}
		<Alert.Root variant="destructive">
			<Info class="size-4" />
			<Alert.Title>Pemberitahuan</Alert.Title>
			<Alert.Description class="text-xs">{data.error}</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- FILTER BAR -->
	<div class="rounded-2xl border border-primary/10 bg-white p-3.5 shadow-sm sm:p-4">
		<div class="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-start">
			<!-- Search -->
			<div class="w-full">
				<AdminSearchField
					bind:value={searchQuery}
					onValueChange={queueSearch}
					placeholder="Cari aktivitas, admin, atau keyword..."
					label="Cari log"
				/>
			</div>

			<!-- Dropdown Filters -->
			<div class="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto lg:grid-cols-[140px_140px_auto]">
				<!-- Menu Filter -->
				<select
					bind:value={menuFilter}
					onchange={(e) => navigateFilters({ menu: e.currentTarget.value, page: 1 })}
					class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					{#each ACTION_MENUS as m}
						<option value={m.id}>{m.label}</option>
					{/each}
				</select>

				<!-- Date Mode Filter -->
				<select
					bind:value={dateMode}
					onchange={(e) => changeDateMode(e.currentTarget.value)}
					class="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<option value="all">Semua Waktu</option>
					<option value="daily">Hari Ini</option>
					<option value="weekly">7 Hari Terakhir</option>
					<option value="monthly">30 Hari Terakhir</option>
					<option value="range">Range Kustom</option>
				</select>

				<!-- Date Range Pickers (When in range mode) -->
				{#if dateMode === 'range'}
					<div class="col-span-2 grid gap-2 sm:col-span-4 sm:grid-cols-2 lg:col-span-3">
						<DatePicker
							bind:value={customStart}
							onValueChange={(val) => changeCustomRange(val, customEnd)}
							class="h-10 min-w-0 rounded-lg"
							placeholder="Tanggal Awal"
						/>
						<DatePicker
							bind:value={customEnd}
							onValueChange={(val) => changeCustomRange(customStart, val)}
							class="h-10 min-w-0 rounded-lg"
							placeholder="Tanggal Akhir"
						/>
					</div>
				{/if}

				<!-- Reset Button -->
				{#if hasActiveFilters}
					<Button
						variant="outline"
						class="col-span-2 h-10 w-full sm:col-span-4 lg:col-span-3 transition-transform duration-150 active:scale-[0.98]"
						onclick={resetFilters}
					>
						Reset Filter
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- MAIN CONTENT -->
	{#if logs.length === 0}
		<Card.Root class="flex min-h-80 flex-col items-center justify-center p-8 text-center border-dashed border-border/70">
			<div class="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-2xs mb-3">
				<History class="size-7" />
			</div>
			<h3 class="text-base font-bold text-foreground">Tidak Ada Aktivitas Ditemukan</h3>
			<p class="mt-1 max-w-sm text-xs text-muted-foreground">
				{#if hasActiveFilters}
					Tidak ada log yang sesuai dengan filter atau kata kunci pencarian yang dipilih.
				{:else}
					Belum ada riwayat aktivitas yang tercatat dalam sistem.
				{/if}
			</p>
			{#if hasActiveFilters}
				<Button variant="outline" size="sm" class="mt-4 gap-1.5" onclick={resetFilters}>
					Reset Filter
				</Button>
			{/if}
		</Card.Root>
	{:else if viewMode === 'list'}
			<!-- DATA TABLE VIEW -->
		<Card.Root class="overflow-hidden border-border/70 shadow-xs">
			<Table.Root>
				<Table.Header class="bg-muted/40">
					<Table.Row>
						<Table.Head class="w-40 text-xs font-bold">Waktu</Table.Head>
						<Table.Head class="w-32 text-xs font-bold">Menu</Table.Head>
						<Table.Head class="w-28 text-xs font-bold">Aksi</Table.Head>
						<Table.Head class="w-48 text-xs font-bold">Admin</Table.Head>
						<Table.Head class="text-xs font-bold">Pesan / Detail Aktivitas</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each logs as log (log.id)}
						<Table.Row class="hover:bg-muted/30">
							<Table.Cell class="text-xs font-medium text-muted-foreground whitespace-nowrap">
								<div>{log.dateString}</div>
								<div class="text-[11px] text-muted-foreground/80">{log.timeString}</div>
							</Table.Cell>

							<Table.Cell>
								<span class="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
									{log.menuMeta.label}
								</span>
							</Table.Cell>

							<Table.Cell>
								<span class={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold', log.actionMeta.bgClass)}>
									{log.actionMeta.label}
								</span>
							</Table.Cell>

							<Table.Cell>
								<div class="flex items-center gap-1.5 text-xs">
									<div class="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
										{log.user.initials}
									</div>
									<div class="truncate font-semibold text-foreground">{log.user.displayName}</div>
								</div>
							</Table.Cell>

							<Table.Cell class="text-xs font-medium text-foreground">
								{log.message}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
		
	{:else}
<!-- TIMELINE STREAM VIEW (EMIL DESIGN POLISH) -->
		<div class="space-y-8">
			{#each groupedLogs as group (group.date)}
				<div class="space-y-4">
					<!-- DATE SECTION HEADER -->
					<div class="sticky top-14 z-10 flex items-center gap-3 bg-muted/40 py-1.5 backdrop-blur">
						<span class="flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1 text-xs font-bold text-foreground shadow-2xs">
							<Calendar class="size-3.5 text-primary" />
							<span>{group.date}</span>
						</span>
						<div class="h-px flex-1 bg-border/60"></div>
						<span class="text-[11px] font-semibold text-muted-foreground">
							{group.items.length} aktivitas
						</span>
					</div>

					<!-- TIMELINE STREAM ITEMS -->
					<div class="relative pl-6 sm:pl-8 space-y-3 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border/70">
						{#each group.items as log (log.id)}
							<div class="relative group rounded-2xl border border-border/70 bg-card p-4 shadow-2xs transition-[border-color,box-shadow,transform] duration-150 ease-out hover:border-primary/40 hover:shadow-xs active:scale-[0.995]">
								<!-- TIMELINE NODE CONNECTOR -->
								<div class={cn(
									'absolute -left-6 sm:-left-8 top-5 size-2.5 rounded-full ring-4 ring-background transition-transform group-hover:scale-125',
									log.actionMeta.dotClass
								)}></div>

								<div class="flex flex-col gap-2.5">
									<!-- TOP META ROW -->
									<div class="flex flex-wrap items-center justify-between gap-2">
										<div class="flex flex-wrap items-center gap-2">
											<!-- MENU BADGE -->
											<span class="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
												{#if log.menu === 'Product'}<Package class="size-3 text-emerald-600" />
												{:else if log.menu === 'Order'}<ShoppingCart class="size-3 text-amber-600" />
												{:else if log.menu === 'Category'}<Tags class="size-3 text-purple-600" />
												{:else if log.menu === 'Addon'}<ListPlus class="size-3 text-blue-600" />
												{:else if log.menu === 'Banner'}<Image class="size-3 text-pink-600" />
												{:else if log.menu === 'SiteInfo'}<Store class="size-3 text-indigo-600" />
												{:else if log.menu === 'WhatsApp'}<MessageCircle class="size-3 text-teal-600" />
												{:else}<Activity class="size-3 text-slate-600" />
												{/if}
												<span>{log.menuMeta.label}</span>
											</span>

											<!-- ACTION TYPE BADGE -->
											<span class={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold', log.actionMeta.bgClass)}>
												{#if log.actionType === 'create'}<PlusCircle class="size-3" />
												{:else if log.actionType === 'delete'}<Trash2 class="size-3" />
												{:else}<RefreshCw class="size-3" />
												{/if}
												<span>{log.actionMeta.label}</span>
											</span>
										</div>

										<!-- TIMESTAMP -->
										<div class="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
											<Clock class="size-3" />
											<span title={log.fullDateTimeString}>{log.timeString} ({log.relativeTime})</span>
										</div>
									</div>

									<!-- MESSAGE CONTENT -->
									<div class="text-sm font-semibold text-foreground leading-relaxed">
										{log.message}
									</div>

									<!-- USER INFO FOOTER -->
									<div class="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
										<div class="flex items-center gap-2 text-muted-foreground">
											<div class="flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary ring-1 ring-primary/20">
												{log.user.initials}
											</div>
											<span class="font-medium text-foreground">{log.user.displayName}</span>
											{#if log.user.email}
												<span class="text-[11px] text-muted-foreground">({log.user.email})</span>
											{/if}
										</div>

										<span class="font-mono text-[10px] text-muted-foreground/70">
											#{log.id.slice(-6)}
										</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- PAGINATION -->
	{#if pagination.totalPages > 1}
		<div class="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
			<div class="text-xs text-muted-foreground">
				Menampilkan <strong>{pagination.from}</strong> - <strong>{pagination.to}</strong> dari <strong>{pagination.totalItems}</strong> aktivitas
			</div>

			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={pagination.page <= 1}
					onclick={() => navigateFilters({ page: pagination.page - 1 })}
					class="transition-transform duration-150 active:scale-[0.98]"
				>
					Sebelumnya
				</Button>

				<span class="px-2 text-xs font-semibold text-foreground">
					Hal. {pagination.page} dari {pagination.totalPages}
				</span>

				<Button
					variant="outline"
					size="sm"
					disabled={pagination.page >= pagination.totalPages}
					onclick={() => navigateFilters({ page: pagination.page + 1 })}
					class="transition-transform duration-150 active:scale-[0.98]"
				>
					Berikutnya
				</Button>
			</div>
		</div>
	{/if}
</AdminPage>
