<script>
	import './layout.css';
	import { page } from '$app/stores';
	import { onMount, untrack } from 'svelte';
	import { Clock, MapPin, MessageCircle } from 'lucide-svelte';
	import CartDrawer from '$lib/components/CartDrawer.svelte';
	import { cart } from '$lib/stores/cart.svelte.js';
	import { getWhatsAppHref, normalizeSiteInfo } from '$lib/site-info.js';
	import { createI18n, languageOptions, setI18n } from '$lib/i18n.svelte.js';

	let { children, data } = $props();
	const i18n = setI18n(createI18n(untrack(() => data?.locale)));

	// Check if we are on an admin route
	let isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));
	let siteInfo = $derived(normalizeSiteInfo(data?.siteInfo));
	let whatsappHref = $derived(getWhatsAppHref(siteInfo?.whatsapp_number));

	onMount(() => {
		i18n.init(data?.locale);
	});
</script>

{#if !isAdminRoute}
	<div class="min-h-screen flex flex-col font-['Plus_Jakarta_Sans'] bg-white">
		<header class="w-full bg-white relative z-50">
			<div class="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
				<a href="/" class="font-pinyon text-3xl tracking-wider text-[#8C5A35]">desertbyfir</a>
				
				<nav class="hidden md:flex items-center gap-8 text-[#4A3B32] text-sm font-medium">
					<a href="/#about" class="hover:text-[#8C5A35] transition-colors">{i18n.t('nav.about')}</a>
					<a href="/#catalog" class="hover:text-[#8C5A35] transition-colors">{i18n.t('nav.catalog')}</a>
					<a href="/#features" class="hover:text-[#8C5A35] transition-colors">{i18n.t('nav.features')}</a>
				</nav>

				<div class="flex items-center gap-2 sm:gap-4 text-[#4A3B32] text-sm font-semibold">
					<div class="flex rounded-full border border-[#8C5A35]/15 bg-[#FFFBF7] p-1" aria-label={i18n.t('language.switchLabel')}>
						{#each languageOptions as option}
							<button
								type="button"
								onclick={() => i18n.setLocale(option.code)}
								class="rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors {i18n.locale === option.code ? 'bg-[#8C5A35] text-white shadow-sm' : 'text-[#4A3B32]/60 hover:text-[#8C5A35]'}"
								aria-pressed={i18n.locale === option.code}
								aria-label={`${i18n.t('language.switchLabel')}: ${option.name}`}
							>
								{option.label}
							</button>
						{/each}
					</div>

					<button onclick={() => cart.isOpen = true} class="relative p-2 text-[#4A3B32] hover:text-[#8C5A35] transition-colors" aria-label={i18n.t('nav.openCart')}>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
						{#if cart.totalItems > 0}
							<span class="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">{cart.totalItems}</span>
						{/if}
					</button>
					
					<div class="hidden sm:flex items-center gap-2">
						<MessageCircle class="h-4 w-4 text-[#8C5A35]" />
						{#if whatsappHref}
							<a href={whatsappHref} target="_blank" rel="noreferrer" class="hover:text-[#8C5A35] transition-colors">{siteInfo.whatsapp_number}</a>
						{:else}
							<span>{siteInfo.whatsapp_number}</span>
						{/if}
					</div>
				</div>
			</div>
		</header>
		<main class="flex-1">
			{@render children()}
		</main>
		<footer id="contact" class="bg-[#FFFBF7] border-t border-[#8C5A35]/10">
			<div class="container mx-auto grid gap-12 px-6 py-16 text-center md:grid-cols-3 lg:px-12">
				<div class="flex flex-col items-center">
					<Clock class="mb-4 h-8 w-8 text-[#4A3B32]/60" strokeWidth={1.8} />
					<p class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#4A3B32]/70">{i18n.t('footer.pickup')}</p>
					<p class="mb-3 text-sm font-extrabold uppercase tracking-wide text-[#4A3B32]">{siteInfo.pickup_days}</p>
					<div class="space-y-1 text-sm leading-relaxed text-[#4A3B32]/65">
						{#if siteInfo.pickup_store_hours}
							<p>{siteInfo.pickup_store_hours}</p>
						{/if}
						{#if siteInfo.pickup_manager_hours}
							<p>{siteInfo.pickup_manager_hours}</p>
						{/if}
					</div>
				</div>

				<div class="flex flex-col items-center">
					<MapPin class="mb-4 h-8 w-8 text-[#4A3B32]/60" strokeWidth={1.8} />
					<p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A3B32]/70">{i18n.t('footer.address')}</p>
					<p class="max-w-xs whitespace-pre-line text-sm leading-relaxed text-[#4A3B32]/65">{siteInfo.address}</p>
				</div>

				<div class="flex flex-col items-center">
					<MessageCircle class="mb-4 h-8 w-8 text-[#4A3B32]/60" strokeWidth={1.8} />
					<p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A3B32]/70">{i18n.t('footer.whatsapp')}</p>
					{#if whatsappHref}
						<a href={whatsappHref} target="_blank" rel="noreferrer" class="text-sm font-semibold text-[#4A3B32]/70 hover:text-[#8C5A35] transition-colors">{siteInfo.whatsapp_number}</a>
					{:else}
						<p class="text-sm font-semibold text-[#4A3B32]/70">{siteInfo.whatsapp_number}</p>
					{/if}
				</div>
			</div>

			<div class="bg-[#8C5A35] py-8 text-white">
				<div class="container mx-auto flex flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row lg:px-12">
					<a href="/" class="font-pinyon text-3xl tracking-wider">desertbyfir</a>
					<p class="text-xs text-white/70">
						&copy; {new Date().getFullYear()} desertbyfir Cake Shop. {i18n.t('footer.rights')}
					</p>
				</div>
			</div>
		</footer>

		<!-- Global Cart Drawer -->
		<CartDrawer />
	</div>
{:else}
	{@render children()}
{/if}
