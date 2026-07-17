<script>
	import QuickAddModal from '$lib/components/QuickAddModal.svelte';
	import * as Pagination from '$lib/components/ui/pagination';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { goto } from '$app/navigation';
	import { getImageUrl } from '$lib/image-url.js';
	import { getI18n } from '$lib/i18n.svelte.js';
	import { getStartFromPrice } from '$lib/pricing.js';

	let { data } = $props();
	const i18n = getI18n();

	let selectedCategory = $state('All');
	let isQuickAddOpen = $state(false);
	let selectedProduct = $state(null);
	let products = $derived(data.products);
	let pagination = $derived(data.pagination);

	$effect(() => {
		selectedCategory = data.selectedCategory || 'All';
	});

	function openQuickAdd(product) {
		selectedProduct = product;
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

	function getCatalogHref(page = 1, category = selectedCategory) {
		const params = new URLSearchParams();
		if (category && category !== 'All') params.set('category', category);
		if (page > 1) params.set('page', String(page));
		const query = params.toString();
		return query ? `/catalog?${query}` : '/catalog';
	}

	async function navigateCatalog(page = 1, category = selectedCategory) {
		await goto(getCatalogHref(page, category), {
			noScroll: true,
			keepFocus: true
		});
		scrollCatalogIntoView();
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
		<h1 class="font-['Playfair_Display'] text-4xl font-bold text-[#4A3B32] sm:text-5xl">
			{i18n.t('catalog.title')}
		</h1>
		<p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#4A3B32]/60 sm:text-base">
			{i18n.t('catalog.description')}
		</p>
	</div>
</section>

<section class="bg-white py-12 sm:py-16">
	<div class="container mx-auto px-6 text-center">
		<div class="relative -mx-6 sm:mx-0">
			<div class="absolute bottom-2 left-0 top-0 z-10 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none sm:hidden"></div>
			<div class="absolute bottom-2 right-0 top-0 z-10 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none sm:hidden"></div>
			<div class="flex snap-x gap-3 overflow-x-auto px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:px-0 [&::-webkit-scrollbar]:hidden">
				<button
					class="shrink-0 snap-start whitespace-nowrap rounded-full border px-6 py-2 text-[13px] font-semibold tracking-wide transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] {selectedCategory === 'All' ? 'border-primary bg-primary text-white shadow-sm shadow-primary/15' : 'border-slate-200 text-[#4A3B32] hover:border-primary hover:text-primary'}"
					onclick={() => navigateCatalog(1, 'All')}
				>
					{i18n.t('home.allCategory')}
				</button>
				{#each data.categories as category}
					<button
						class="shrink-0 snap-start whitespace-nowrap rounded-full border px-6 py-2 text-[13px] font-semibold tracking-wide transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-out active:scale-[0.97] {selectedCategory === category.slug ? 'border-primary bg-primary text-white shadow-sm shadow-primary/15' : 'border-slate-200 text-[#4A3B32] hover:border-primary hover:text-primary'}"
						onclick={() => navigateCatalog(1, category.slug)}
					>
						{category.name}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div id="catalog-grid" class="container mx-auto mt-10 scroll-mt-24 max-w-7xl px-4 sm:px-6">
		{#key `${selectedCategory}-${pagination.page}`}
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
					{#if selectedCategory === 'All'}
						{i18n.t('home.emptyCatalog')}
					{:else}
						{i18n.t('home.emptyCategory')}
					{/if}
				</div>
			{/each}
		</div>
		{/key}

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
					onPageChange={(page) => navigateCatalog(page)}
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
						<a href={getCatalogHref(index + 1)}>Page {index + 1}</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</section>

<QuickAddModal bind:isOpen={isQuickAddOpen} product={selectedProduct} />
