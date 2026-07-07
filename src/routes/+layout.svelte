<script>
	import './layout.css';
	import { page } from '$app/stores';
	import { Clock, MapPin, MessageCircle } from 'lucide-svelte';
	import CartDrawer from '$lib/components/CartDrawer.svelte';
	import { cart } from '$lib/stores/cart.svelte.js';
	import { getWhatsAppHref, normalizeSiteInfo } from '$lib/site-info.js';

	let { children, data } = $props();

	// Check if we are on an admin route
	let isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));
	let siteInfo = $derived(normalizeSiteInfo(data?.siteInfo));
	let whatsappHref = $derived(getWhatsAppHref(siteInfo?.whatsapp_number));
</script>

<svelte:head>
	<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

{#if !isAdminRoute}
	<div class="min-h-screen flex flex-col font-['Plus_Jakarta_Sans'] bg-white">
		<header class="w-full bg-white relative z-50">
			<div class="container mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
				<a href="/" class="text-[#8C5A35] font-serif italic text-3xl tracking-wider font-['Playfair_Display']">desertbyfir</a>
				
				<nav class="hidden md:flex items-center gap-8 text-[#4A3B32] text-sm font-medium">
					<a href="/#about" class="hover:text-[#8C5A35] transition-colors">Tentang Kami</a>
					<a href="/#catalog" class="hover:text-[#8C5A35] transition-colors">Katalog</a>
					<a href="/#features" class="hover:text-[#8C5A35] transition-colors">Keunggulan</a>
				</nav>

				<div class="flex items-center gap-4 text-[#4A3B32] text-sm font-semibold">
					<button onclick={() => cart.isOpen = true} class="relative p-2 text-[#4A3B32] hover:text-[#8C5A35] transition-colors" aria-label="Open Cart">
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
					<p class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#4A3B32]/70">Pickup</p>
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
					<p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A3B32]/70">Address</p>
					<p class="max-w-xs whitespace-pre-line text-sm leading-relaxed text-[#4A3B32]/65">{siteInfo.address}</p>
				</div>

				<div class="flex flex-col items-center">
					<MessageCircle class="mb-4 h-8 w-8 text-[#4A3B32]/60" strokeWidth={1.8} />
					<p class="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#4A3B32]/70">WhatsApp</p>
					{#if whatsappHref}
						<a href={whatsappHref} target="_blank" rel="noreferrer" class="text-sm font-semibold text-[#4A3B32]/70 hover:text-[#8C5A35] transition-colors">{siteInfo.whatsapp_number}</a>
					{:else}
						<p class="text-sm font-semibold text-[#4A3B32]/70">{siteInfo.whatsapp_number}</p>
					{/if}
				</div>
			</div>

			<div class="bg-[#8C5A35] py-8 text-white">
				<div class="container mx-auto flex flex-col items-center justify-between gap-4 px-6 text-center sm:flex-row lg:px-12">
					<a href="/" class="font-['Playfair_Display'] text-3xl italic tracking-wider">desertbyfir</a>
					<p class="text-xs text-white/70">
						&copy; {new Date().getFullYear()} desertbyfir Cake Shop. All rights reserved.
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
