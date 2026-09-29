<script>
	import { deserialize, enhance } from '$app/forms';
	import { fade, fly } from 'svelte/transition';
	import Wallet from '@lucide/svelte/icons/wallet';
	import Plus from '@lucide/svelte/icons/plus';
	import Edit from '@lucide/svelte/icons/edit';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Tags from '@lucide/svelte/icons/tags';
	import Calendar from '@lucide/svelte/icons/calendar';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';
	import ReceiptText from '@lucide/svelte/icons/receipt-text';
	import Layers from '@lucide/svelte/icons/layers';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import Search from '@lucide/svelte/icons/search';

	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import Loading from '$lib/components/Loading.svelte';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminSearchField from '$lib/components/admin/AdminSearchField.svelte';
	import AdminViewToggle from '$lib/components/admin/AdminViewToggle.svelte';
	import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';
	import { cn } from '$lib/utils';

	let { data, form } = $props();

	// Local reactive state
	let categories = $state([]);
	let expenses = $state([]);

	$effect(() => {
		categories = data.categories ?? [];
		expenses = data.expenses ?? [];
	});

	// Filter state
	let searchQuery = $state('');
	let selectedCategoryFilter = $state('all');
	let periodFilter = $state('all'); // 'all' | 'daily' | 'weekly' | 'monthly' | 'range'
	let customStart = $state('');
	let customEnd = $state('');
	let viewMode = $state('list'); // 'list' | 'card'

	// Expense Drawer Create / Edit State
	let isExpenseDrawerOpen = $state(false);
	let editingExpense = $state(null);
	let expenseName = $state('');
	let expenseAmount = $state('');
	let expenseCategoryId = $state('');
	let isSubmittingExpense = $state(false);
	let expenseError = $state('');

	// Category Combobox & Inline Creation inside Expense Drawer
	let categorySearchQuery = $state('');
	let isCategoryDropdownOpen = $state(false);
	let isCreatingCategoryInline = $state(false);
	let categoryInlineError = $state('');

	// Manage Categories Modal State
	let isManageCategoriesModalOpen = $state(false);
	let newCategoryName = $state('');
	let editingCategory = $state(null);
	let editingCategoryName = $state('');
	let isSubmittingCategory = $state(false);
	let categoryModalError = $state('');

	// Delete Confirmation State
	let deletingExpense = $state(null);
	let deletingCategory = $state(null);
	let isDeleting = $state(false);

	// Date Filtering Helpers
	function isDateInPeriod(dateStr, period) {
		if (!dateStr || period === 'all') return true;
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return true;
		const now = new Date();

		if (period === 'daily') {
			return (
				date.getFullYear() === now.getFullYear() &&
				date.getMonth() === now.getMonth() &&
				date.getDate() === now.getDate()
			);
		}

		if (period === 'weekly') {
			const oneWeekAgo = new Date();
			oneWeekAgo.setDate(now.getDate() - 7);
			return date >= oneWeekAgo && date <= now;
		}

		if (period === 'monthly') {
			const oneMonthAgo = new Date();
			oneMonthAgo.setDate(now.getDate() - 30);
			return date >= oneMonthAgo && date <= now;
		}

		if (period === 'range') {
			const d = date.getTime();
			const start = customStart ? new Date(customStart).setHours(0,0,0,0) : null;
			const end = customEnd ? new Date(customEnd).setHours(23,59,59,999) : null;
			if (start && d < start) return false;
			if (end && d > end) return false;
			return true;
		}

		return true;
	}

	// Filtered Expenses
	let filteredExpenses = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		return expenses.filter((item) => {
			const matchSearch =
				!query ||
				(item.name || '').toLowerCase().includes(query) ||
				(item.categoryName || item.category_name || '').toLowerCase().includes(query);

			const matchCategory =
				selectedCategoryFilter === 'all' ||
				(item.categoryId || item.category_id) === selectedCategoryFilter;

			const matchPeriod = isDateInPeriod(item.createdAt || item.created_at, periodFilter);

			return matchSearch && matchCategory && matchPeriod;
		});
	});

	// Metrics
	let totalFilteredAmount = $derived(
		filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
	);

	let allExpensesTotal = $derived(
		expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)
	);

	let categoryStats = $derived.by(() => {
		const map = {};
		for (const item of filteredExpenses) {
			const catName = item.categoryName || item.category_name || 'Tanpa Kategori';
			map[catName] = (map[catName] || 0) + Number(item.amount || 0);
		}
		let topCat = '-';
		let topCatAmount = 0;
		for (const [cat, amt] of Object.entries(map)) {
			if (amt > topCatAmount) {
				topCat = cat;
				topCatAmount = amt;
			}
		}
		return { topCat, topCatAmount };
	});

	// Filtered categories for Combobox search
	let filteredCategoriesForDropdown = $derived.by(() => {
		const query = categorySearchQuery.trim().toLowerCase();
		const seenNames = new Set();
		return categories.filter((category) => {
			const name = (category.name || '').trim().toLocaleLowerCase('id-ID');
			if (!name || seenNames.has(name) || (query && !name.includes(query))) return false;
			seenNames.add(name);
			return true;
		});
	});

	let canCreateCategoryInline = $derived.by(() => {
		const query = categorySearchQuery.trim();
		if (!query) return false;
		return !categories.some((c) => (c.name || '').trim().toLocaleLowerCase('id-ID') === query.toLocaleLowerCase('id-ID'));
	});

	function getCategoryNameById(id) {
		const cat = categories.find((c) => c.id === id);
		return cat?.name || '';
	}

	function openCreateExpenseDrawer() {
		editingExpense = null;
		expenseName = '';
		expenseAmount = '';
		expenseCategoryId = categories[0]?.id || '';
		categorySearchQuery = getCategoryNameById(expenseCategoryId);
		isCategoryDropdownOpen = false;
		categoryInlineError = '';
		expenseError = '';
		isExpenseDrawerOpen = true;
	}

	function openEditExpenseDrawer(item) {
		editingExpense = item;
		expenseName = item.name || '';
		expenseAmount = item.amount || '';
		expenseCategoryId = item.categoryId || item.category_id || '';
		categorySearchQuery = item.categoryName || item.category_name || getCategoryNameById(expenseCategoryId);
		isCategoryDropdownOpen = false;
		categoryInlineError = '';
		expenseError = '';
		isExpenseDrawerOpen = true;
	}

	function closeExpenseDrawer() {
		isExpenseDrawerOpen = false;
		editingExpense = null;
		expenseName = '';
		expenseAmount = '';
		expenseCategoryId = '';
		categorySearchQuery = '';
		isCategoryDropdownOpen = false;
		categoryInlineError = '';
		expenseError = '';
	}

	function selectCategoryFromDropdown(category) {
		if (category) {
			expenseCategoryId = category.id;
			categorySearchQuery = category.name;
		} else {
			expenseCategoryId = '';
			categorySearchQuery = '';
		}
		isCategoryDropdownOpen = false;
	}

	function addOrUpdateCategory(category) {
		categories = [...categories.filter((item) => item.id !== category.id), category]
			.sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
	}

	function formatCurrency(amount) {
		if (!amount && amount !== 0) return '-';
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return '-';
		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatDateTime(dateStr) {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return '-';
		return date.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<AdminPage>
	<AdminPageHeader
		title="Pengeluaran Operasional"
		description="Catat dan pantau pengeluaran operasional usaha dengan kategori yang terstruktur."
	>
		{#snippet actions()}
			<Button
				type="button"
				onclick={openCreateExpenseDrawer}
				class="gap-1.5 font-bold transition-transform duration-150 active:scale-[0.98]"
			>
				<Plus class="size-4" />
				<span>Catat Pengeluaran</span>
			</Button>
			<Button
				type="button"
				variant="outline"
				onclick={() => {
					isManageCategoriesModalOpen = true;
					categoryModalError = '';
					newCategoryName = '';
					editingCategory = null;
				}}
				class="gap-1.5 transition-transform duration-150 active:scale-[0.98]"
			>
				<Tags class="size-4" />
				<span>Kelola Kategori</span>
			</Button>
			<AdminViewToggle bind:value={viewMode} />
		{/snippet}
	</AdminPageHeader>

	<!-- Feedback Flash Alert -->
	{#if form?.success && form?.message}
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in duration-200">
			✓ {form.message}
		</div>
	{:else if form?.error}
		<div class="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive animate-in fade-in duration-200">
			Error: {form.error}
		</div>
	{/if}

	<!-- Metric Summary Cards -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<!-- Card 1: Total Amount -->
		<Card.Root class="border-border/80 bg-card shadow-xs">
			<Card.Content class="p-4 sm:p-5 flex items-start justify-between gap-3">
				<div class="space-y-1">
					<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						Total Pengeluaran
						{#if periodFilter !== 'all'}
							<span class="text-primary font-bold lowercase">({periodFilter})</span>
						{/if}
					</p>
					<h3 class="text-2xl font-extrabold text-foreground">{formatCurrency(totalFilteredAmount)}</h3>
					<p class="text-xs text-muted-foreground">
						Dari {filteredExpenses.length} catatan pengeluaran
					</p>
				</div>
				<div class="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
					<TrendingDown class="size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Card 2: Total Items / Transactions -->
		<Card.Root class="border-border/80 bg-card shadow-xs">
			<Card.Content class="p-4 sm:p-5 flex items-start justify-between gap-3">
				<div class="space-y-1">
					<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jumlah Catatan</p>
					<h3 class="text-2xl font-extrabold text-foreground">{filteredExpenses.length} Transaksi</h3>
					<p class="text-xs text-muted-foreground">
						{categories.length} kategori aktif tersedia
					</p>
				</div>
				<div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
					<ReceiptText class="size-5" />
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Card 3: Top Category -->
		<Card.Root class="border-border/80 bg-card shadow-xs">
			<Card.Content class="p-4 sm:p-5 flex items-start justify-between gap-3">
				<div class="space-y-1 min-w-0">
					<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kategori Terbesar</p>
					<h3 class="text-lg font-bold text-foreground truncate" title={categoryStats.topCat}>
						{categoryStats.topCat}
					</h3>
					<p class="text-xs text-muted-foreground">
						{categoryStats.topCatAmount > 0 ? formatCurrency(categoryStats.topCatAmount) : 'Belum ada data'}
					</p>
				</div>
				<div class="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
					<Layers class="size-5" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filter & Search Bar -->
	<div class="rounded-2xl border border-border/80 bg-card p-3 shadow-xs sm:p-4 space-y-3">
		<div class="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto] lg:items-center">
			<!-- Search -->
			<div class="w-full">
				<AdminSearchField
					bind:value={searchQuery}
					placeholder="Cari pengeluaran, nota, atau kategori..."
					label="Cari pengeluaran"
				/>
			</div>

			<!-- Filter Dropdowns -->
			<div class="grid grid-cols-2 gap-2 sm:flex sm:items-center">
				<!-- Category Filter -->
				<select
					bind:value={selectedCategoryFilter}
					class="h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<option value="all">Semua Kategori ({expenses.length})</option>
					{#each categories as cat}
						{@const count = expenses.filter((e) => (e.categoryId || e.category_id) === cat.id).length}
						<option value={cat.id}>{cat.name} ({count})</option>
					{/each}
				</select>

				<!-- Period Filter -->
				<select
					bind:value={periodFilter}
					class="h-10 rounded-lg border border-input bg-background px-3 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<option value="all">Semua Waktu</option>
					<option value="monthly">30 Hari Terakhir</option>
					<option value="weekly">7 Hari Terakhir</option>
					<option value="daily">Hari Ini</option>
					<option value="range">Pilih Tanggal (Range)</option>
				</select>

				{#if periodFilter === 'range'}
					<DateRangePicker 
						bind:startValue={customStart} 
						bind:endValue={customEnd} 
						class="h-10 rounded-lg min-w-[240px]" 
					/>
				{/if}

				{#if searchQuery || selectedCategoryFilter !== 'all' || periodFilter !== 'all'}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => {
							searchQuery = '';
							selectedCategoryFilter = 'all';
							periodFilter = 'all';
							customStart = '';
							customEnd = '';
						}}
						class="col-span-2 sm:col-span-1 h-10 text-xs text-muted-foreground hover:text-foreground"
					>
						Reset Filter
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Data View: List (Table) vs Cards -->
	{#if viewMode === 'list'}
		<div class="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
			<Table.Root>
				<Table.Header class="bg-muted/30">
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="w-[180px] font-bold">Tanggal & Waktu</Table.Head>
						<Table.Head class="font-bold">Keterangan Pengeluaran</Table.Head>
						<Table.Head class="w-[180px] font-bold">Kategori</Table.Head>
						<Table.Head class="w-[160px] text-right font-bold">Nominal</Table.Head>
						<Table.Head class="w-[120px] text-right font-bold">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredExpenses as item (item.id)}
						<Table.Row class="transition-colors hover:bg-muted/25">
							<Table.Cell class="text-xs text-muted-foreground">
								<div class="font-medium text-foreground">{formatDate(item.createdAt || item.created_at)}</div>
								<div class="text-[11px] text-muted-foreground">{formatDateTime(item.createdAt || item.created_at).split(',')[1] || ''}</div>
							</Table.Cell>
							<Table.Cell>
								<span class="font-semibold text-foreground text-sm leading-snug">{item.name}</span>
							</Table.Cell>
							<Table.Cell>
								<span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
									<Tags class="size-3" />
									<span>{item.categoryName || item.category_name || getCategoryNameById(item.categoryId || item.category_id) || 'Umum'}</span>
								</span>
							</Table.Cell>
							<Table.Cell class="text-right">
								<span class="font-extrabold text-foreground text-sm tabular-nums">
									{formatCurrency(item.amount)}
								</span>
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onclick={() => openEditExpenseDrawer(item)}
										title="Edit Pengeluaran"
										class="hover:text-primary"
									>
										<Edit class="size-4" />
									</Button>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onclick={() => (deletingExpense = item)}
										title="Hapus Pengeluaran"
										class="hover:text-destructive text-muted-foreground"
									>
										<Trash2 class="size-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={5} class="py-12">
								<AdminEmptyState
									icon={Wallet}
									title="Tidak ada pengeluaran ditemukan"
									description={searchQuery || selectedCategoryFilter !== 'all' || periodFilter !== 'all'
										? 'Coba ubah kata kunci pencarian atau sesuaikan filter Anda.'
										: 'Belum ada catatan pengeluaran operasional. Klik tombol di bawah untuk mencatat.'}
								>
									{#if !searchQuery && selectedCategoryFilter === 'all' && periodFilter === 'all'}
										<Button type="button" onclick={openCreateExpenseDrawer} class="mt-2 gap-1.5 font-bold">
											<Plus class="size-4" />
											Catat Pengeluaran Pertama
										</Button>
									{/if}
								</AdminEmptyState>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{:else}
		<!-- Card Grid View -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredExpenses as item (item.id)}
				<Card.Root class="group border border-border/80 bg-card hover:border-border hover:shadow-md transition-all duration-150 rounded-2xl flex flex-col justify-between">
					<Card.Content class="p-5 flex flex-col gap-3">
						<div class="flex items-start justify-between gap-2">
							<span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
								<Tags class="size-3" />
								<span>{item.categoryName || item.category_name || getCategoryNameById(item.categoryId || item.category_id) || 'Umum'}</span>
							</span>
							<span class="text-xs text-muted-foreground font-medium">
								{formatDate(item.createdAt || item.created_at)}
							</span>
						</div>

						<div>
							<h4 class="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
								{item.name}
							</h4>
						</div>

						<div class="pt-2 border-t border-border/60 flex items-center justify-between">
							<div>
								<span class="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Nominal</span>
								<span class="text-lg font-extrabold text-foreground tabular-nums">
									{formatCurrency(item.amount)}
								</span>
							</div>
							<div class="flex items-center gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onclick={() => openEditExpenseDrawer(item)}
									title="Edit Pengeluaran"
								>
									<Edit class="size-4" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onclick={() => (deletingExpense = item)}
									title="Hapus Pengeluaran"
									class="hover:text-destructive text-muted-foreground"
								>
									<Trash2 class="size-4" />
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<div class="col-span-full">
					<AdminEmptyState
						icon={Wallet}
						title="Tidak ada pengeluaran ditemukan"
						description={searchQuery || selectedCategoryFilter !== 'all' || periodFilter !== 'all'
							? 'Coba ubah kata kunci pencarian atau sesuaikan filter Anda.'
							: 'Belum ada catatan pengeluaran operasional.'}
					>
						{#if !searchQuery && selectedCategoryFilter === 'all' && periodFilter === 'all'}
							<Button type="button" onclick={openCreateExpenseDrawer} class="mt-2 gap-1.5 font-bold">
								<Plus class="size-4" />
								Catat Pengeluaran Pertama
							</Button>
						{/if}
					</AdminEmptyState>
				</div>
			{/each}
		</div>
	{/if}
</AdminPage>

<!-- EXPENSE CREATE / EDIT DRAWER -->
{#if isExpenseDrawerOpen}
	<div class="fixed inset-0 z-50 flex justify-end">
		<button
			type="button"
			class="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
			transition:fade={{ duration: 200 }}
			onclick={closeExpenseDrawer}
			aria-label="Tutup drawer pengeluaran"
		></button>

		<div
			class="relative z-50 flex h-full w-full max-w-lg flex-col border-l border-border bg-card p-6 shadow-2xl overflow-y-auto"
			transition:fly={{ x: 300, duration: 250 }}
		>
			<div class="flex items-center justify-between pb-4 border-b border-border">
				<div>
					<h3 class="text-lg font-bold text-foreground">
						{editingExpense ? 'Ubah Catatan Pengeluaran' : 'Catat Pengeluaran Baru'}
					</h3>
					<p class="text-xs text-muted-foreground mt-0.5">
						{editingExpense ? 'Perbarui nominal atau kategori pengeluaran ini.' : 'Masukkan rincian pengeluaran operasional usaha.'}
					</p>
				</div>
				<Button type="button" variant="ghost" size="icon-sm" onclick={closeExpenseDrawer} aria-label="Tutup form">
					<X class="size-4" />
				</Button>
			</div>

			{#if expenseError}
				<div class="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
					{expenseError}
				</div>
			{/if}

			<form
				method="POST"
				action={editingExpense ? '?/updateExpense' : '?/createExpense'}
				use:enhance={() => {
					isSubmittingExpense = true;
					expenseError = '';
					return async ({ update, result }) => {
						await update();
						isSubmittingExpense = false;
						if (result.type === 'success' && result.data?.success) {
							closeExpenseDrawer();
						} else if (result.type === 'failure') {
							expenseError = result.data?.error || 'Gagal menyimpan pengeluaran.';
						}
					};
				}}
				class="mt-6 flex-1 flex flex-col justify-between space-y-6"
			>
				{#if editingExpense}
					<input type="hidden" name="id" value={editingExpense.id} />
				{/if}

				<div class="space-y-4">
					<!-- NAMA / KETERANGAN PENGELUARAN -->
					<div class="space-y-1.5">
						<Label for="expense_name" class="font-bold text-foreground">
							Keterangan / Nama Pengeluaran *
						</Label>
						<Input
							id="expense_name"
							name="name"
							type="text"
							bind:value={expenseName}
							placeholder="Contoh: Beli Tepung Terigu 10kg & Mentega"
							required
							class="h-10 rounded-xl"
						/>
					</div>

					<!-- NOMINAL AMOUNT -->
					<div class="space-y-1.5">
						<Label for="expense_amount" class="font-bold text-foreground">
							Nominal Biaya (Rp) *
						</Label>
						<PriceInput
							id="expense_amount"
							name="amount"
							bind:value={expenseAmount}
							placeholder="0"
							required
						/>
						<p class="text-[11px] text-muted-foreground">Format angka rupiah otomatis.</p>
					</div>

					<!-- KATEGORI COMBOBOX WITH INLINE CREATE -->
					<div class="space-y-1.5">
						<Label for="category_search_combobox" class="font-bold text-foreground">
							Kategori Pengeluaran *
						</Label>
						<input type="hidden" name="categoryId" value={expenseCategoryId} />

						<div class="relative">
							<Input
								id="category_search_combobox"
								type="text"
								placeholder="Cari atau ketik nama kategori baru..."
								bind:value={categorySearchQuery}
								onfocus={() => (isCategoryDropdownOpen = true)}
								oninput={() => {
									expenseCategoryId = '';
									isCategoryDropdownOpen = true;
									categoryInlineError = '';
								}}
								class="h-10 rounded-xl pr-9 bg-background"
								autocomplete="off"
							/>
							<button
								type="button"
								class="absolute inset-y-0 right-2 flex items-center px-2 text-muted-foreground hover:text-foreground"
								onclick={() => (isCategoryDropdownOpen = !isCategoryDropdownOpen)}
								aria-label="Toggle category dropdown"
							>
								<ArrowUpDown class="size-3.5" />
							</button>

							{#if isCategoryDropdownOpen}
								<div class="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl">
									{#each filteredCategoriesForDropdown as cat}
										<button
											type="button"
											class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
											onclick={() => selectCategoryFromDropdown(cat)}
										>
											<span class="font-medium text-foreground">{cat.name}</span>
											{#if expenseCategoryId === cat.id}
												<span class="flex items-center gap-1 text-[11px] font-bold text-primary">
													<Check class="size-3" /> Terpilih
												</span>
											{/if}
										</button>
									{/each}

									<!-- INLINE CREATE BUTTON -->
									{#if canCreateCategoryInline}
										<button
											type="button"
											class="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
											onclick={async () => {
												const catName = categorySearchQuery.trim();
												if (!catName || isCreatingCategoryInline) return;
												isCreatingCategoryInline = true;
												categoryInlineError = '';
												
												// Inline form submit to action ?/createCategory
												const formData = new FormData();
												formData.append('name', catName);
												try {
													const res = await fetch('?/createCategory', {
														method: 'POST',
														body: formData
													});
											const result = deserialize(await res.text());
											if (result.type === 'success' && result.data?.category?.id) {
												const newCat = result.data.category;
												addOrUpdateCategory(newCat);
												selectCategoryFromDropdown(newCat);
											} else {
												categoryInlineError = result.data?.error || 'Gagal membuat kategori.';
													}
												} catch (e) {
													categoryInlineError = e?.message || 'Gagal membuat kategori.';
												} finally {
													isCreatingCategoryInline = false;
												}
											}}
										>
											<Plus class="size-3.5 shrink-0" />
											<span>
												{#if isCreatingCategoryInline}
													Membuat kategori "{categorySearchQuery.trim()}"...
												{:else}
													Buat kategori "{categorySearchQuery.trim()}"
												{/if}
											</span>
										</button>
									{/if}

									{#if filteredCategoriesForDropdown.length === 0 && !canCreateCategoryInline}
										<div class="px-3 py-2.5 text-xs text-muted-foreground text-center">
											Belum ada kategori. Ketik nama untuk membuat.
										</div>
									{/if}
								</div>
							{/if}
						</div>

						{#if categoryInlineError}
							<p class="text-[11px] font-semibold text-destructive mt-1">{categoryInlineError}</p>
						{/if}
					</div>
				</div>

				<!-- SUBMIT ACTIONS -->
				<div class="pt-4 border-t border-border flex items-center justify-end gap-2">
					<Button type="button" variant="outline" onclick={closeExpenseDrawer} disabled={isSubmittingExpense}>
						Batal
					</Button>
					<Button type="submit" disabled={isSubmittingExpense || !expenseName.trim() || !expenseCategoryId} class="font-bold">
						{#if isSubmittingExpense}
							<Loading label="Menyimpan..." size="sm" class="text-primary-foreground" />
						{:else}
							{editingExpense ? 'Simpan Perubahan' : 'Catat Pengeluaran'}
						{/if}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- MANAGE CATEGORIES MODAL -->
{#if isManageCategoriesModalOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
			transition:fade={{ duration: 150 }}
			onclick={() => (isManageCategoriesModalOpen = false)}
			aria-label="Tutup modal kategori"
		></button>

		<div
			class="relative z-50 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
			transition:fly={{ y: 20, duration: 200 }}
		>
			<div class="flex items-center justify-between pb-3 border-b border-border">
				<div>
					<h3 class="text-lg font-bold text-foreground">Kelola Kategori Pengeluaran</h3>
					<p class="text-xs text-muted-foreground mt-0.5">Tambah, ubah nama, atau hapus kategori operasional.</p>
				</div>
				<Button type="button" variant="ghost" size="icon-sm" onclick={() => (isManageCategoriesModalOpen = false)}>
					<X class="size-4" />
				</Button>
			</div>

			{#if categoryModalError}
				<div class="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
					{categoryModalError}
				</div>
			{/if}

			<!-- CREATE NEW CATEGORY FORM -->
			<form
				method="POST"
				action="?/createCategory"
				use:enhance={() => {
					isSubmittingCategory = true;
					categoryModalError = '';
					return async ({ update, result }) => {
						await update();
						isSubmittingCategory = false;
						if (result.type === 'success' && result.data?.success) {
							if (result.data.category) {
								addOrUpdateCategory(result.data.category);
							}
							newCategoryName = '';
						} else if (result.type === 'failure') {
							categoryModalError = result.data?.error || 'Gagal menambahkan kategori.';
						}
					};
				}}
				class="mt-4 flex gap-2"
			>
				<Input
					type="text"
					name="name"
					bind:value={newCategoryName}
					placeholder="Nama kategori baru (contoh: Kemasan & Box)..."
					class="h-10 rounded-xl flex-1 text-xs"
				/>
				<Button type="submit" disabled={isSubmittingCategory || !newCategoryName.trim()} class="font-bold h-10 shrink-0">
					<Plus class="size-4" />
					Tambah
				</Button>
			</form>

			<!-- CATEGORIES LIST -->
			<div class="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 max-h-80">
				{#each categories as cat (cat.id)}
					<div class="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors">
						{#if editingCategory?.id === cat.id}
							<!-- EDIT MODE -->
							<form
								method="POST"
								action="?/updateCategory"
								use:enhance={() => {
									isSubmittingCategory = true;
									categoryModalError = '';
									return async ({ update, result }) => {
										await update();
										isSubmittingCategory = false;
										if (result.type === 'success' && result.data?.success) {
											categories = categories.map((c) => c.id === cat.id ? { ...c, name: editingCategoryName } : c);
											editingCategory = null;
											editingCategoryName = '';
										} else if (result.data?.error) {
											categoryModalError = result.data.error;
										}
									};
								}}
								class="flex items-center gap-2 flex-1"
							>
								<input type="hidden" name="id" value={cat.id} />
								<Input
									type="text"
									name="name"
									bind:value={editingCategoryName}
									class="h-8 rounded-lg text-xs flex-1"
									required
								/>
								<Button type="submit" size="sm" class="h-8 font-bold px-2.5" disabled={isSubmittingCategory}>
									Simpan
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									class="h-8 px-2"
									onclick={() => {
										editingCategory = null;
										editingCategoryName = '';
									}}
								>
									Batal
								</Button>
							</form>
						{:else}
							<!-- VIEW MODE -->
							<div class="flex items-center gap-2 min-w-0">
								<Tags class="size-3.5 text-primary shrink-0" />
								<span class="font-semibold text-xs text-foreground truncate">{cat.name}</span>
								<span class="text-[10px] text-muted-foreground">
									({expenses.filter((e) => (e.categoryId || e.category_id) === cat.id).length} pengeluaran)
								</span>
							</div>

							<div class="flex items-center gap-1 shrink-0">
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onclick={() => {
										editingCategory = cat;
										editingCategoryName = cat.name;
										categoryModalError = '';
									}}
									title="Ubah nama kategori"
								>
									<Edit class="size-3.5" />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									onclick={() => {
										deletingCategory = cat;
										categoryModalError = '';
									}}
									class="text-muted-foreground hover:text-destructive"
									title="Hapus kategori"
								>
									<Trash2 class="size-3.5" />
								</Button>
							</div>
						{/if}
					</div>
				{:else}
					<div class="py-8 text-center text-xs text-muted-foreground">
						Belum ada kategori pengeluaran.
					</div>
				{/each}
			</div>

			<div class="mt-4 pt-3 border-t border-border flex justify-end">
				<Button type="button" variant="outline" onclick={() => (isManageCategoriesModalOpen = false)}>
					Selesai
				</Button>
			</div>
		</div>
	</div>
{/if}

<!-- DELETE EXPENSE CONFIRMATION DIALOG -->
{#if deletingExpense}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="fixed inset-0 bg-background/80 backdrop-blur-xs"
			transition:fade={{ duration: 150 }}
			onclick={() => (deletingExpense = null)}
			aria-label="Batal hapus"
		></button>
		<div
			class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
			transition:fly={{ y: 16, duration: 180 }}
		>
			<h3 class="text-lg font-bold text-foreground">Hapus Catatan Pengeluaran?</h3>
			<p class="mt-2 text-sm text-muted-foreground leading-relaxed">
				Yakin ingin menghapus pengeluaran <strong class="text-foreground">"{deletingExpense.name}"</strong> senilai <strong class="text-foreground">{formatCurrency(deletingExpense.amount)}</strong>? Tindakan ini tidak dapat dibatalkan.
			</p>

			<form
				method="POST"
				action="?/deleteExpense"
				use:enhance={() => {
					isDeleting = true;
					return async ({ update, result }) => {
						await update();
						isDeleting = false;
						if (result.type === 'success') {
							expenses = expenses.filter((e) => e.id !== deletingExpense.id);
							deletingExpense = null;
						}
					};
				}}
				class="mt-6 flex justify-end gap-2"
			>
				<input type="hidden" name="id" value={deletingExpense.id} />
				<Button type="button" variant="outline" onclick={() => (deletingExpense = null)} disabled={isDeleting}>
					Batal
				</Button>
				<Button type="submit" variant="destructive" disabled={isDeleting}>
					{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
				</Button>
			</form>
		</div>
	</div>
{/if}

<!-- DELETE CATEGORY CONFIRMATION DIALOG -->
{#if deletingCategory}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="fixed inset-0 bg-background/80 backdrop-blur-xs"
			transition:fade={{ duration: 150 }}
			onclick={() => (deletingCategory = null)}
			aria-label="Batal hapus"
		></button>
		<div
			class="relative z-50 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
			transition:fly={{ y: 16, duration: 180 }}
		>
			<h3 class="text-lg font-bold text-foreground">Hapus Kategori Pengeluaran?</h3>
			<p class="mt-2 text-sm text-muted-foreground leading-relaxed">
				Yakin ingin menghapus kategori <strong class="text-foreground">"{deletingCategory.name}"</strong>? Kategori tidak dapat dihapus jika masih digunakan oleh catatan pengeluaran.
			</p>

			<form
				method="POST"
				action="?/deleteCategory"
				use:enhance={() => {
					isDeleting = true;
					return async ({ update, result }) => {
						await update();
						isDeleting = false;
						if (result.type === 'success' && result.data?.success) {
							categories = categories.filter((c) => c.id !== deletingCategory.id);
							deletingCategory = null;
						} else if (result.data?.error) {
							categoryModalError = result.data.error;
							deletingCategory = null;
						}
					};
				}}
				class="mt-6 flex justify-end gap-2"
			>
				<input type="hidden" name="id" value={deletingCategory.id} />
				<Button type="button" variant="outline" onclick={() => (deletingCategory = null)} disabled={isDeleting}>
					Batal
				</Button>
				<Button type="submit" variant="destructive" disabled={isDeleting}>
					{isDeleting ? 'Menghapus...' : 'Ya, Hapus Kategori'}
				</Button>
			</form>
		</div>
	</div>
{/if}
