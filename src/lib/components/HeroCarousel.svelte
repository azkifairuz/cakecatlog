<script>
	import { getI18n } from '$lib/i18n.svelte.js';
	import { getImageUrl } from '$lib/image-url.js';

	let { banners = [] } = $props();
	const i18n = getI18n();

	// Fallback data if no banners are provided
	const fallbackBanners = [
		{ id: 'default-1', image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' },
		{ id: 'default-2', image_url: 'https://images.unsplash.com/photo-1557308536-ee471ef2c390?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80' }
	];
	let displayBanners = $derived(banners.length > 0 ? banners : fallbackBanners);

	let currentIndex = $state(0);

	$effect(() => {
		const interval = setInterval(() => {
			currentIndex = (currentIndex + 1) % displayBanners.length;
		}, 5000);

		return () => clearInterval(interval);
	});
</script>

<section class="relative w-full h-[100dvh] overflow-hidden bg-[#4A3B32]">
	<!-- Carousel Backgrounds -->
	{#each displayBanners as banner, i (banner.id)}
		<div 
			class="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out"
			style="opacity: {currentIndex === i ? 1 : 0}; z-index: {currentIndex === i ? 10 : 0};"
		>
			<!-- Dark overlay for better text readability -->
			<div class="absolute inset-0 bg-black/35 z-10"></div>
			
			<img 
				src={getImageUrl(banner.image_url, { width: i === 0 ? 1280 : 1600, quality: i === 0 ? 68 : 75, resize: 'cover' })} 
				alt={i18n.t('hero.bannerAlt', { number: i + 1 })} 
				class="w-full h-full object-cover object-center"
				loading={i === 0 ? "eager" : "lazy"}
				fetchpriority={i === 0 ? "high" : "auto"}
				decoding="async"
			/>
		</div>
	{/each}

	<!-- Static Overlay Content -->
	<div class="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6">
		<p class="text-white/80 text-xs sm:text-sm font-bold uppercase tracking-[0.3em] mb-4 drop-shadow-md">
			{i18n.t('hero.eyebrow')}
		</p>
		<h1 class="font-pinyon text-6xl leading-none text-white drop-shadow-lg mb-8 md:text-8xl lg:text-9xl">
			dessertbyfir
		</h1>
		<p class="text-white/90 leading-relaxed max-w-lg mx-auto mb-10 text-base sm:text-lg drop-shadow-md">
			{i18n.t('hero.description')}
		</p>
		
		<a 
			href="#catalog" 
			class="px-10 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/50 text-white rounded-full text-sm font-bold tracking-widest transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:scale-105"
		>
			{i18n.t('hero.cta')}
		</a>
	</div>

	<!-- Dots Indicator -->
	{#if displayBanners.length > 1}
		<div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
			{#each displayBanners as _, i}
				<button 
					type="button"
					aria-label={i18n.t('hero.slideLabel', { number: i + 1 })}
					onclick={() => currentIndex = i}
					class="transition-all duration-300 rounded-full {currentIndex === i ? 'w-8 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'}"
				></button>
			{/each}
		</div>
	{/if}
</section>
