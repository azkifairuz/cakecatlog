<script>
	import emblaCarouselSvelte from 'embla-carousel-svelte';
	import Autoplay from 'embla-carousel-autoplay';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { getImageUrl } from '$lib/image-url.js';
	import { getStartFromPrice } from '$lib/pricing.js';
	import { getI18n } from '$lib/i18n.svelte.js';

	let { topPicks = [], onQuickAdd = null } = $props();
	const i18n = getI18n();

	let emblaApi = $state();
	let selectedIndex = $state(0);
	let scrollSnaps = $state([]);

	// Autoplay configuration: pause on interaction/hover
	const autoplayOptions = {
		delay: 4000,
		stopOnInteraction: false,
		stopOnMouseEnter: true,
		rootNode: (emblaRoot) => emblaRoot.parentElement
	};

	let options = { loop: true, align: 'start' };
	let plugins = [Autoplay(autoplayOptions)];

	function onInit(event) {
		emblaApi = event.detail;
		scrollSnaps = emblaApi.scrollSnapList();
		emblaApi.on('select', onSelect);
		onSelect();
	}

	function onSelect() {
		if (!emblaApi) return;
		selectedIndex = emblaApi.selectedScrollSnap();
	}

	function scrollPrev() {
		if (emblaApi) emblaApi.scrollPrev();
	}

	function scrollNext() {
		if (emblaApi) emblaApi.scrollNext();
	}

	function scrollTo(index) {
		if (emblaApi) emblaApi.scrollTo(index);
	}

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}
</script>

{#if topPicks.length > 0}
	<section class="py-16 md:py-24 bg-[#FFFBF7] relative overflow-hidden">
		<div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
			
			<div class="flex items-end justify-between mb-10">
				<div>
					<p class="text-primary text-xs font-bold uppercase tracking-widest mb-2">{i18n.t('topPicks.eyebrow')}</p>
					<h2 class="text-3xl md:text-4xl font-bold text-[#4A3B32] font-['Playfair_Display']">{i18n.t('topPicks.title')}</h2>
				</div>
				
				<!-- Desktop Navigation Arrows -->
				<div class="hidden sm:flex items-center gap-3">
					<button 
						onclick={scrollPrev} 
						class="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-[#4A3B32] hover:bg-primary hover:border-primary hover:text-white transition-all shadow-sm"
						aria-label={i18n.t('topPicks.previous')}
					>
						<ChevronLeft class="w-5 h-5" />
					</button>
					<button 
						onclick={scrollNext} 
						class="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-[#4A3B32] hover:bg-primary hover:border-primary hover:text-white transition-all shadow-sm"
						aria-label={i18n.t('topPicks.next')}
					>
						<ChevronRight class="w-5 h-5" />
					</button>
				</div>
			</div>

			<!-- Embla Viewport -->
			<div class="overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0" use:emblaCarouselSvelte={{ options, plugins }} onemblaInit={onInit}>
				<div class="flex gap-4 sm:gap-6 touch-pan-y">
					{#each topPicks as product}
						{@const primaryImg = product.product_images?.find(img => img.is_primary) || product.product_images?.[0]}
						<div class="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-[0_0_30%] lg:flex-[0_0_22%] min-w-0">
							<div class="bg-white rounded-[2rem] p-3 sm:p-4 border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(140,90,53,0.15)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative">
								<!-- Card Link Cover -->
								<a href={`/product/${product.id}`} class="absolute inset-0 z-0" aria-label={i18n.t('home.productDetailLabel', { name: product.name })}></a>
								
								<div class="aspect-square w-full rounded-[1.5rem] overflow-hidden bg-[#FFFBF7] mb-3 sm:mb-5 relative flex items-center justify-center p-2 z-10 pointer-events-none">
									{#if primaryImg}
										<img src={getImageUrl(primaryImg.image_url, { width: 600, height: 600, quality: 78, resize: 'cover' })} alt={product.name} class="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
									{:else}
										<div class="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 rounded-xl">{i18n.t('home.noImage')}</div>
									{/if}
									
									<!-- Badge Terlaris -->
									<div class="absolute top-3 left-3 px-2.5 py-1 bg-primary/90 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-bold rounded-full shadow-sm z-10 flex items-center gap-1">
										<svg class="w-3 h-3 text-amber-300" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"></path></svg>
										{i18n.t('topPicks.badge')}
									</div>
								</div>
								
								<div class="px-2 flex flex-col flex-1 z-10 pointer-events-none">
									<h3 class="font-bold text-[#4A3B32] mb-1.5 text-[13px] sm:text-[15px] group-hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
									<p class="text-[11px] sm:text-[13px] text-[#4A3B32]/50 line-clamp-2 mb-4 sm:mb-6 flex-1 leading-relaxed">{product.description || ''}</p>
									
									<div class="flex items-center justify-between mt-auto pointer-events-auto">
										<div class="flex flex-col">
											<span class="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-[#4A3B32]/50 mb-0.5">{i18n.t('home.startFrom')}</span>
											<span class="font-bold text-[#4A3B32] text-[13px] sm:text-lg leading-none">{formatCurrency(getStartFromPrice(product))}</span>
										</div>
										<div class="flex gap-2 items-center relative z-20">
											{#if onQuickAdd}
												<button onclick={() => onQuickAdd(product)} class="p-2 sm:p-2.5 rounded-full bg-primary/10 text-primary shadow-sm shadow-primary/5 hover:bg-primary hover:text-white hover:shadow-primary/20 active:scale-[0.92] transition-[background-color,color,transform,box-shadow] duration-150 ease-out" title={i18n.t('home.addToCartTitle')}>
													<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
												</button>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Mobile & Tablet Dots Indicator -->
			<div class="flex sm:hidden items-center justify-center gap-2 mt-8">
				{#each scrollSnaps as _, index}
					<button 
						type="button" 
						aria-label={i18n.t('hero.slideLabel', { number: index + 1 })}
						onclick={() => scrollTo(index)}
						class="w-2 h-2 rounded-full transition-all duration-300 {index === selectedIndex ? 'w-6 bg-primary' : 'bg-primary/30'}"
					></button>
				{/each}
			</div>

		</div>
	</section>
{/if}
