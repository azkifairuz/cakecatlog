<script>
	import HeroCarousel from '$lib/components/HeroCarousel.svelte';
	import TopPicksCarousel from '$lib/components/TopPicksCarousel.svelte';
	import QuickAddModal from '$lib/components/QuickAddModal.svelte';
	import { getImageUrl } from '$lib/image-url.js';
	import { getStartFromPrice } from '$lib/pricing.js';
	import { getI18n } from '$lib/i18n.svelte.js';

	let { data } = $props();
	const i18n = getI18n();

	let isQuickAddOpen = $state(false);
	let selectedProduct = $state(null);

	function openQuickAdd(product) {
		selectedProduct = product;
		isQuickAddOpen = true;
	}

	let selectedCategory = $state('All');
	
	let filteredProducts = $derived(
		selectedCategory === 'All' 
			? data.products 
			: data.products.filter(p => p.category?.slug === selectedCategory)
	);

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}
</script>

<HeroCarousel banners={data.banners} />

<TopPicksCarousel topPicks={data.topPicks} onQuickAdd={openQuickAdd} />

<!-- ABOUT SECTION -->
<section id="about" class="py-24 bg-white relative overflow-hidden">
	<div class="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-16">
		<div class="md:w-1/2 relative">
			<img src={getImageUrl('https://images.unsplash.com/photo-1621303837174-89787a7d4729?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', { width: 800, quality: 80 })} alt={i18n.t('home.aboutImageAlt')} class="rounded-[2rem] w-full max-w-md mx-auto shadow-2xl relative z-10" loading="lazy" decoding="async" />
			<div class="absolute -bottom-8 -left-8 w-64 h-64 bg-[#FFFBF7] rounded-full -z-10"></div>
		</div>
		<div class="md:w-1/2">
			<h2 class="text-3xl lg:text-4xl font-bold text-[#4A3B32] mb-6 font-['Playfair_Display']">{i18n.t('home.aboutTitle')}</h2>
			<div class="space-y-4 text-[#4A3B32]/70 text-[15px] leading-relaxed">
				<p>
					{i18n.t('home.aboutParagraph1')}
				</p>
				<p>
					{i18n.t('home.aboutParagraph2')}
				</p>
			</div>
			<div class="mt-8">
				<a href="#catalog" class="inline-block px-8 py-3 border border-primary text-primary rounded-full text-sm font-semibold hover:bg-primary/5 transition-all">{i18n.t('home.aboutCta')}</a>
			</div>
		</div>
	</div>
</section>

<!-- FEATURES SECTION -->
<section id="features" class="py-24 bg-[#FFFBF7]">
	<div class="container mx-auto px-6 text-center mb-16">
		<h2 class="text-3xl font-bold text-[#4A3B32] mb-4 font-['Playfair_Display']">{i18n.t('home.featuresTitle')}</h2>
		<p class="text-[#4A3B32]/60 text-sm max-w-xl mx-auto">{i18n.t('home.featuresDescription')}</p>
	</div>
	<div class="container mx-auto grid max-w-5xl grid-cols-4 gap-x-2 gap-y-8 px-4 text-center sm:gap-x-6 sm:px-6 lg:gap-12">
		<!-- Feature 1 -->
		<div class="flex min-w-0 flex-col items-center">
			<div class="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/10 bg-white text-primary shadow-sm sm:mb-5 sm:h-16 sm:w-16">
				<svg class="h-5 w-5 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
			</div>
			<h4 class="mb-0 w-full break-words text-[10px] font-bold leading-tight text-[#4A3B32] sm:mb-2 sm:text-[15px] sm:leading-snug">{i18n.t('home.featureQuality')}</h4>
			<!-- <p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Kami menggunakan bahan baku premium pilihan untuk hasil yang maksimal.</p> -->
		</div>
		<!-- Feature 2 -->
		<div class="flex min-w-0 flex-col items-center">
			<div class="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/10 bg-white text-primary shadow-sm sm:mb-5 sm:h-16 sm:w-16">
				<svg class="h-5 w-5 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
			</div>
			<h4 class="mb-0 w-full break-words text-[10px] font-bold leading-tight text-[#4A3B32] sm:mb-2 sm:text-[15px] sm:leading-snug">{i18n.t('home.featureDelivery')}</h4>
			<!-- <p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Pesanan Anda akan tiba tepat pada waktu yang telah disepakati.</p> -->
		</div>
		<!-- Feature 3 -->
		<div class="flex min-w-0 flex-col items-center">
			<div class="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/10 bg-white text-primary shadow-sm sm:mb-5 sm:h-16 sm:w-16">
				<svg class="h-5 w-5 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
			</div>
			<h4 class="mb-0 w-full break-words text-[10px] font-bold leading-tight text-[#4A3B32] sm:mb-2 sm:text-[15px] sm:leading-snug">{i18n.t('home.featureRecipe')}</h4>
			<!-- <p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Dibuat dari resep original yang disempurnakan oleh ahlinya.</p> -->
		</div>
		<!-- Feature 4 -->
		<div class="flex min-w-0 flex-col items-center">
			<div class="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/10 bg-white text-primary shadow-sm sm:mb-5 sm:h-16 sm:w-16">
				<svg class="h-5 w-5 sm:h-7 sm:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
			</div>
			<h4 class="mb-0 w-full break-words text-[10px] font-bold leading-tight text-[#4A3B32] sm:mb-2 sm:text-[15px] sm:leading-snug">{i18n.t('home.featureService')}</h4>
			<!-- <p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Customer service kami siap membantu mewujudkan kue impian Anda.</p> -->
		</div>
	</div>
</section>

<!-- CATALOG SECTION -->
<section id="catalog" class="py-24 bg-white">
	<div class="container mx-auto px-6 text-center mb-16">
		<h2 class="text-3xl font-bold text-[#4A3B32] mb-8 font-['Playfair_Display']">{i18n.t('home.catalogTitle')}</h2>
		
		<!-- Category Pills -->
		<div class="relative -mx-6 sm:mx-0">
			<!-- Fading Edges for Scroll Indication (Mobile Only) -->
			<div class="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none sm:hidden"></div>
			<div class="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none sm:hidden"></div>

			<div class="flex overflow-x-auto gap-3 pb-2 px-6 sm:px-0 sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x">
			<button 
				class="shrink-0 snap-start sm:snap-align-none whitespace-nowrap px-6 py-2 rounded-full border text-[13px] font-semibold tracking-wide transition-all {selectedCategory === 'All' ? 'border-primary bg-primary text-white' : 'border-slate-200 text-[#4A3B32] hover:border-primary'}"
				onclick={() => selectedCategory = 'All'}
			>
				{i18n.t('home.allCategory')}
			</button>
			{#each data.categories as category}
				<button 
					class="shrink-0 snap-start sm:snap-align-none whitespace-nowrap px-6 py-2 rounded-full border text-[13px] font-semibold tracking-wide transition-all {selectedCategory === category.slug ? 'border-primary bg-primary text-white' : 'border-slate-200 text-[#4A3B32] hover:border-primary'}"
					onclick={() => selectedCategory = category.slug}
				>
					{category.name}
				</button>
			{/each}
			</div>
		</div>
	</div>


	<div class="container mx-auto px-4 sm:px-6 max-w-7xl">
		<div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-12">
			{#each filteredProducts as product}
				{@const primaryImg = product.product_images?.find(img => img.is_primary) || product.product_images?.[0]}
				<div class="bg-white rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(140,90,53,0.15)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative">
					<!-- Card Link Cover (Makes the whole top part clickable) -->
					<a href={`/product/${product.id}`} class="absolute inset-0 z-0" aria-label={i18n.t('home.productDetailLabel', { name: product.name })}></a>
					
					<div class="aspect-square w-full rounded-[1.25rem] overflow-hidden bg-[#FFFBF7] mb-3 sm:mb-5 relative flex items-center justify-center p-1.5 sm:p-2 z-10 pointer-events-none">
						{#if primaryImg}
							<img src={getImageUrl(primaryImg.image_url, { width: 600, height: 600, quality: 78, resize: 'cover' })} alt={product.name} class="w-full h-full object-cover rounded-[1rem] sm:rounded-xl transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 rounded-[1rem] sm:rounded-xl">{i18n.t('home.noImage')}</div>
						{/if}
						{#if product.category}
							<div class="absolute top-2 left-2 sm:top-4 sm:left-4 px-2 py-0.5 sm:px-3 sm:py-1 bg-white/90 backdrop-blur-sm text-primary text-[9px] sm:text-[11px] font-bold rounded-full shadow-sm z-10">
								{product.category.name}
							</div>
						{/if}
					</div>
					<div class="px-1 sm:px-2 flex flex-col flex-1 z-10 pointer-events-none">
						<h3 class="font-bold text-[#4A3B32] mb-1 text-[13px] sm:text-[15px] group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
						<p class="text-[11px] sm:text-[13px] text-[#4A3B32]/50 line-clamp-2 mb-3 sm:mb-6 flex-1 leading-relaxed hidden sm:block">{product.description}</p>
						<p class="text-[11px] sm:text-[13px] text-[#4A3B32]/50 line-clamp-2 mb-3 sm:mb-6 flex-1 leading-relaxed sm:hidden">{product.description || ''}</p>
						
							<div class="flex items-center justify-between mt-auto pointer-events-auto">
								<div class="flex flex-col">
									<span class="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-[#4A3B32]/50 mb-0.5">{i18n.t('home.startFrom')}</span>
									<span class="font-bold text-[#4A3B32] text-[13px] sm:text-lg leading-none">{formatCurrency(getStartFromPrice(product))}</span>
								</div>
								<div class="flex gap-2 items-center relative z-20">
									<button onclick={() => openQuickAdd(product)} class="p-2 sm:p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors" title={i18n.t('home.addToCartTitle')}>
										<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
									</button>
								</div>
							</div>
					</div>
				</div>
			{:else}
				<div class="col-span-full text-center py-16 text-[#4A3B32]/50">
					{#if selectedCategory === 'All'}
						{i18n.t('home.emptyCatalog')}
					{:else}
						{i18n.t('home.emptyCategory')}
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<QuickAddModal bind:isOpen={isQuickAddOpen} product={selectedProduct} />
