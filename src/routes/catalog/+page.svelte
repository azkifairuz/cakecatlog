<script>
	import QuickAddModal from '$lib/components/QuickAddModal.svelte';
	import * as Pagination from '$lib/components/ui/pagination';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { getImageUrl } from '$lib/image-url.js';
	import { getI18n } from '$lib/i18n.svelte.js';
	import { getStartFromPrice } from '$lib/pricing.js';
	import { getProductDetail } from '$lib/api/public.js';
	import { adaptProduct } from '$lib/api/adapters.js';

	let { data } = $props();
	const i18n = getI18n();

	let selectedCategoryId = $state('All');
	let searchInput = $state('');
	let selectedSort = $state('latest');
	let isQuickAddOpen = $state(false);
	let selectedProduct = $state(null);
	let products = $derived(data.products);
	let pagination = $derived(data.pagination);

	$effect(() => {
		selectedCategoryId = data.selectedCategoryId || 'All';
		searchInput = data.searchQuery || '';
		selectedSort = data.sortBy || 'latest';
	});

	async function openQuickAdd(product) {
		try {
			selectedProduct = adaptProduct(await getProductDetail(product.id));
		} catch (error) {
			console.error('Failed to load product detail for quick add', error);
			selectedProduct = adaptProduct(product);
		}
		isQuickAddOpen = true;
	}

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', {
			style: 'currency',
			currency: 'IDR'
		}).format(amount);
	}

	function scrollCatalogIntoView() {
		requestAnimationFrame(() => {
			document.getElementById('catalog-grid')?.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
		});
	}

	function getCatalogHref({
		page = 1,
		categoryId = selectedCategoryId,
		search = searchInput,
		sort = selectedSort
	} = {}) {
		const params = new URLSearchParams();
		if (categoryId && categoryId !== 'All') params.set('categoryId', categoryId);
		if (search && search.trim()) params.set('q', search.trim());
		if (sort && sort !== 'latest') params.set('sortBy', sort);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return query ? `/catalog?${query}` : '/catalog';
	}

	async function navigateCatalog({
		page = 1,
		categoryId = selectedCategoryId,
		search = searchInput,
		sort = selectedSort,
		scroll = true
	} = {}) {
		await goto(getCatalogHref({ page, categoryId, search, sort }), {
			noScroll: true,
			keepFocus: true
		});
		if (scroll) {
			scrollCatalogIntoView();
		}
	}

	function handleSearchSubmit(e) {
		e.preventDefault();
		navigateCatalog({ page: 1, search: searchInput });
	}

	function handleClearSearch() {
		searchInput = '';
		navigateCatalog({ page: 1, search: '' });
	}

	function handleSortChange(e) {
		const newSort = e.target.value;
		selectedSort = newSort;
		navigateCatalog({ page: 1, sort: newSort });
	}

	function handleCategoryClick(categoryId) {
		selectedCategoryId = categoryId;
		navigateCatalog({ page: 1, categoryId });
	}

	function resetAllFilters() {
		selectedCategoryId = 'All';
		searchInput = '';
		selectedSort = 'latest';
		navigateCatalog({ page: 1, categoryId: 'All', search: '', sort: 'latest' });
	}
</script>

<svelte:head>
	<title>{i18n.t('catalog.title')} | dessertbyfir</title>
</svelte:head>

<section class="bg-[#FFFBF7] py-14 sm:py-18">
	<div class="container mx-auto px-6 text-center lg:px-12">
		<p class="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-primary">
			{i18n.t('catalog.eyebrow')}
		</p>
		<h1 class="font-serif text-4xl font-bold text-[#4A3B32] sm:text-5xl">
			{i18n.t('catalog.title')}
		</h1>
		<p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#4A3B32]/60 sm:text-base">
			{i18n.t('catalog.description')}
		</p>
	</div>
</section>

<section class="bg-white py-10 sm:py-14">
	<div class="container mx-auto max-w-7xl px-4 sm:px-6">
		<!-- Search & Sort Controls Toolbar -->
		<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<!-- Search Form -->
			<form onsubmit={handleSearchSubmit} class="relative w-full sm:max-w-md">
				<div class="relative flex items-center">
					<span class="pointer-events-none absolute left-3.5 text-[#4A3B32]/40">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
						</svg>
					</span>
					<input
						type="text"
						bind:value={searchInput}
						placeholder={i18n.t('catalog.searchPlaceholder')}
						aria-label={i18n.t('catalog.searchAriaLabel')}
						class="w-full rounded-full border border-slate-200 bg-[#FFFBF7]/60 py-2.5 pl-10 pr-10 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 shadow-inner transition-all duration-200 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
					{#if searchInput}
						<button
							type="button"
							onclick={handleClearSearch}
							class="absolute right-3 rounded-full p-1 text-[#4A3B32]/40 hover:bg-slate-100 hover:text-[#4A3B32]"
							aria-label={i18n.t('catalog.clearSearch')}
						>
							<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
			</form>

			<!-- Sort Selector -->
			<div class="flex items-center justify-end gap-2 self-end sm:self-auto">
				<span class="text-xs font-semibold text-[#4A3B32]/60 whitespace-nowrap">{i18n.t('catalog.sortBy')}</span>
				<div class="relative inline-block">
					<select
						value={selectedSort}
						onchange={handleSortChange}
						class="appearance-none rounded-full border border-slate-200 bg-white py-2 pl-4 pr-9 text-xs font-semibold text-[#4A3B32] shadow-sm transition-all hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
					>
						<option value="latest">{i18n.t('catalog.sortLatest')}</option>
						<option value="price_asc">{i18n.t('catalog.sortPriceLow')}</option>
						<option value="price_desc">{i18n.t('catalog.sortPriceHigh')}</option>
						<option value="name_asc">{i18n.t('catalog.sortNameAsc')}</option>
						<option value="name_desc">{i18n.t('catalog.sortNameDesc')}</option>
					</select>
					<span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4A3B32]/40">
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
						</svg>
					</span>
				</div>
			</div>
		</div>

		<!-- Category Pills -->
		<div class="relative mb-10 -mx-4 sm:mx-0">
			<div class="absolute bottom-2 left-0 top-0 z-10 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none sm:hidden"></div>
			<div class="absolute bottom-2 right-0 top-0 z-10 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden"></div>
			<div class="flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-start sm:px-0 [&::-webkit-scrollbar]:hidden">
				<button
					class="shrink-0 snap-start whitespace-nowrap rounded-full border px-5 py-2 text-[13px] font-semibold tracking-wide transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] {selectedCategoryId === 'All' ? 'border-primary bg-primary text-white shadow-sm shadow-primary/15' : 'border-slate-200 bg-white text-[#4A3B32] hover:border-primary hover:text-primary'}"
					onclick={() => handleCategoryClick('All')}
				>
					{i18n.t('home.allCategory')}
				</button>
				{#each data.categories as category (category.id)}
					{@const isActive = selectedCategoryId === category.id || selectedCategoryId === category.slug}
					<button
						class="shrink-0 snap-start whitespace-nowrap rounded-full border px-5 py-2 text-[13px] font-semibold tracking-wide transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] {isActive ? 'border-primary bg-primary text-white shadow-sm shadow-primary/15' : 'border-slate-200 bg-white text-[#4A3B32] hover:border-primary hover:text-primary'}"
						onclick={() => handleCategoryClick(category.id)}
					>
						{category.name}
					</button>
				{/each}
			</div>
		</div>

		<!-- Active Filter Badges / Reset -->
		{#if (selectedCategoryId !== 'All' || data.searchQuery || data.sortBy !== 'latest')}
			<div class="mb-6 flex flex-wrap items-center gap-2 text-xs">
				<span class="text-[#4A3B32]/50">Filter aktif:</span>
				{#if data.searchQuery}
					<span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
						"{data.searchQuery}"
						<button type="button" onclick={handleClearSearch} class="hover:text-primary/70">✕</button>
					</span>
				{/if}
				{#if selectedCategoryId !== 'All'}
					{@const activeCat = data.categories.find(c => c.id === selectedCategoryId || c.slug === selectedCategoryId)}
					<span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
						{activeCat?.name || selectedCategoryId}
						<button type="button" onclick={() => handleCategoryClick('All')} class="hover:text-primary/70">✕</button>
					</span>
				{/if}
				<button
					onclick={resetAllFilters}
					class="text-xs font-semibold text-primary underline underline-offset-2 hover:text-[#724828]"
				>
					{i18n.t('catalog.resetFilters')}
				</button>
			</div>
		{/if}

		<!-- Product Grid -->
		<div id="catalog-grid" class="scroll-mt-24">
			{#key `${selectedCategoryId}-${data.searchQuery}-${data.sortBy}-${pagination.page}`}
			<div class="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-12 md:grid-cols-3 lg:grid-cols-4">
				{#each products as product, index (product.id)}
					{@const primaryImg = product.product_images?.find((img) => img.is_primary) || product.product_images?.[0]}
					<div
						class="group relative flex h-full flex-col rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] transition-[transform,box-shadow,border-color] duration-200 ease-out hover:border-primary/15 hover:shadow-[0_10px_34px_-14px_rgba(140,90,53,0.28)] active:scale-[0.99] sm:p-4 motion-safe:hover:-translate-y-1"
						in:fly={{ y: 8, duration: 220, delay: Math.min(index, 8) * 35, easing: cubicOut }}
					>
						<a href={`/product/${product.id}`} class="absolute inset-0 z-0" aria-label={i18n.t('home.productDetailLabel', { name: product.name })}></a>

						<div class="relative z-10 mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#FFFBF7] p-1.5 pointer-events-none sm:mb-5 sm:p-2">
							{#if primaryImg}
								<img src={getImageUrl(primaryImg.image_url, { width: 600, height: 600, quality: 78, resize: 'cover' })} alt={product.name} class="h-full w-full rounded-[1rem] object-cover transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.035] sm:rounded-xl" loading="lazy" decoding="async" />
							{:else}
								<div class="flex h-full w-full items-center justify-center rounded-[1rem] bg-slate-100 text-slate-300 sm:rounded-xl">{i18n.t('home.noImage')}</div>
							{/if}
							{#if product.category}
								<div class="absolute left-2 top-2 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold text-primary shadow-sm backdrop-blur-sm sm:left-4 sm:top-4 sm:px-3 sm:py-1 sm:text-[11px]">
									{product.category.name}
								</div>
							{/if}
						</div>

						<div class="relative z-10 flex flex-1 flex-col px-1 pointer-events-none sm:px-2">
							<h2 class="mb-1 line-clamp-1 text-[13px] font-bold text-[#4A3B32] transition-colors group-hover:text-primary sm:text-[15px]">{product.name}</h2>
							<p class="mb-3 line-clamp-2 flex-1 text-[11px] leading-relaxed text-[#4A3B32]/50 sm:mb-6 sm:text-[13px]">{product.description || ''}</p>

							<div class="mt-auto flex items-center justify-between pointer-events-auto">
								<div class="flex flex-col">
									<span class="mb-0.5 text-[8px] font-bold uppercase tracking-wider text-[#4A3B32]/50 sm:text-[10px]">{i18n.t('home.startFrom')}</span>
									<span class="text-[13px] font-bold leading-none text-[#4A3B32] sm:text-lg">{formatCurrency(getStartFromPrice(product))}</span>
								</div>
								<button onclick={() => openQuickAdd(product)} class="rounded-full bg-primary/10 p-2 text-primary shadow-sm shadow-primary/5 transition-[background-color,color,transform,box-shadow] duration-150 ease-out hover:bg-primary hover:text-white hover:shadow-primary/20 active:scale-[0.92] sm:p-2.5" title={i18n.t('home.addToCartTitle')}>
									<svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
								</button>
							</div>
						</div>
					</div>
				{:else}
					<div class="col-span-full py-16 text-center text-[#4A3B32]/50">
						{#if data.searchQuery}
							<div class="flex flex-col items-center gap-3">
								<p class="text-base font-semibold text-[#4A3B32]">{i18n.t('catalog.emptySearch')}</p>
								<button
									onclick={handleClearSearch}
									class="rounded-full bg-primary px-6 py-2 text-xs font-semibold text-white shadow hover:bg-[#724828]"
								>
									{i18n.t('catalog.clearSearch')}
								</button>
							</div>
						{:else if selectedCategoryId !== 'All'}
							<div class="flex flex-col items-center gap-3">
								<p class="text-base font-semibold text-[#4A3B32]">{i18n.t('home.emptyCategory')}</p>
								<button
									onclick={() => handleCategoryClick('All')}
									class="rounded-full bg-primary px-6 py-2 text-xs font-semibold text-white shadow hover:bg-[#724828]"
								>
									{i18n.t('catalog.resetFilters')}
								</button>
							</div>
						{:else}
							<p>{i18n.t('home.emptyCatalog')}</p>
						{/if}
					</div>
				{/each}
			</div>
			{/key}

			<!-- Pagination Section -->
			{#if pagination.totalProducts > pagination.pageSize}
				<div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-8 sm:flex-row">
					<p class="text-sm text-[#4A3B32]/55">
						Menampilkan
						<span class="font-semibold text-[#4A3B32]">{pagination.from}</span>-<span class="font-semibold text-[#4A3B32]">{pagination.to}</span>
						dari <span class="font-semibold text-[#4A3B32]">{pagination.totalProducts}</span> produk
					</p>
					<Pagination.Root
						count={pagination.totalProducts}
						perPage={pagination.pageSize}
						page={pagination.page}
						siblingCount={1}
						onPageChange={(page) => navigateCatalog({ page })}
						class="w-auto"
					>
						{#snippet children({ pages })}
						<Pagination.Content class="flex-wrap gap-1">
							<Pagination.Item>
								<Pagination.Previous
									class="rounded-full border border-slate-200 bg-white text-[#4A3B32] hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
								/>
							</Pagination.Item>
							{#each pages as pageItem (pageItem.key)}
								<Pagination.Item>
									{#if pageItem.type === 'ellipsis'}
										<Pagination.Ellipsis class="text-[#4A3B32]/45" />
									{:else}
										<Pagination.Link
											page={pageItem}
											isActive={pagination.page === pageItem.value}
											class="rounded-full border {pagination.page === pageItem.value ? 'border-primary bg-primary text-white hover:bg-primary hover:text-white' : 'border-slate-200 bg-white text-[#4A3B32] hover:border-primary hover:text-primary'}"
										/>
									{/if}
								</Pagination.Item>
							{/each}
							<Pagination.Item>
								<Pagination.Next
									class="rounded-full border border-slate-200 bg-white text-[#4A3B32] hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
								/>
							</Pagination.Item>
						</Pagination.Content>
						{/snippet}
					</Pagination.Root>
					<div class="sr-only">
						{#each Array(pagination.totalPages) as _, index}
							<a href={getCatalogHref({ page: index + 1 })}>Page {index + 1}</a>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>

<QuickAddModal bind:isOpen={isQuickAddOpen} product={selectedProduct} />
