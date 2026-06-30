<script>
	import './layout.css';
	import { page } from '$app/stores';

	let { children } = $props();

	// Check if we are on an admin route
	let isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));

	import CartDrawer from '$lib/components/CartDrawer.svelte';
	import { cart } from '$lib/stores/cart.svelte.js';
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
						<svg class="w-4 h-4 text-[#8C5A35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
						<span>0812-3456-7890</span>
					</div>
				</div>
			</div>
		</header>
		<main class="flex-1">
			{@render children()}
		</main>
		<footer class="bg-[#FFFBF7] py-8 border-t border-[#8C5A35]/10">
			<div class="container mx-auto px-6 text-center">
				<a href="/" class="text-[#8C5A35] font-serif italic text-2xl tracking-wider font-['Playfair_Display'] block mb-4">desertbyfir</a>
				<p class="text-sm text-[#4A3B32]/60">
					&copy; {new Date().getFullYear()} desertbyfir Cake Shop. All rights reserved.
				</p>
			</div>
		</footer>

		<!-- Global Cart Drawer -->
		<CartDrawer />
	</div>
{:else}
	{@render children()}
{/if}
