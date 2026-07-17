<script>
	import { getImageUrl } from '$lib/image-url.js';
	import { cart } from '$lib/stores/cart.svelte.js';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { getI18n } from '$lib/i18n.svelte.js';

	const i18n = getI18n();
	
	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}
	
	function closeCart() {
		cart.isOpen = false;
	}

	function handleBackdropKey(event) {
		if (event.key === 'Escape' || (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' '))) {
			closeCart();
		}
	}
</script>

{#if cart.isOpen}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
		transition:fade={{ duration: 180 }}
		onclick={closeCart}
		onkeydown={handleBackdropKey}
		role="button"
		tabindex="0"
		aria-label={i18n.t('cart.close')}
	></div>
	
	<!-- Drawer -->
	<div 
		class="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
		transition:fly={{ x: '100%', duration: 280, opacity: 1, easing: cubicOut }}
	>
		<!-- Header -->
		<div class="px-6 py-5 border-b border-primary/10 flex items-center justify-between bg-[#FFFBF7]">
			<h2 class="text-xl font-bold text-[#4A3B32] font-['Playfair_Display']">{i18n.t('cart.title')}</h2>
			<button 
				onclick={closeCart}
				aria-label={i18n.t('cart.close')}
				class="p-2 text-[#4A3B32]/50 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
			</button>
		</div>

		<!-- Items -->
		<div class="flex-1 overflow-y-auto p-6 space-y-6">
			{#if cart.items.length === 0}
				<div class="h-full flex flex-col items-center justify-center text-center opacity-50">
					<svg class="w-16 h-16 mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
					<p class="text-lg font-medium text-[#4A3B32]">{i18n.t('cart.emptyTitle')}</p>
					<p class="text-sm mt-2">{i18n.t('cart.emptyDescription')}</p>
				</div>
			{:else}
				{#each cart.items as item, index (item.cartItemId)}
					<div
						class="flex gap-4 p-4 rounded-2xl border border-primary/10 bg-slate-50 relative group"
						in:fly={{ y: 8, duration: 200, delay: Math.min(index, 5) * 35, easing: cubicOut }}
					>
						<button 
							onclick={() => cart.removeItem(item.cartItemId)}
							class="absolute -top-2 -right-2 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-sm transition-[background-color,opacity,transform] duration-150 ease-out hover:bg-red-200 active:scale-[0.9] sm:opacity-0 sm:group-hover:opacity-100"
							title={i18n.t('cart.removeItem')}
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
						</button>
						
						<div class="w-20 h-20 rounded-xl bg-white border border-primary/10 overflow-hidden flex-shrink-0">
							{#if item.primary_image}
								<img src={getImageUrl(item.primary_image, { width: 160, height: 160, quality: 75, resize: 'cover' })} alt={item.product_name} class="w-full h-full object-cover" loading="lazy" decoding="async" />
							{:else}
								<div class="w-full h-full flex items-center justify-center text-[#4A3B32]/30">
									<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
								</div>
							{/if}
						</div>
						
						<div class="flex-1 min-w-0">
							<h3 class="font-bold text-[#4A3B32] truncate">{item.product_name}</h3>
							<p class="text-xs text-[#4A3B32]/70 mt-1">
								{item.cake_size} &middot; {item.quantity}x
							</p>
							
							<div class="text-xs text-primary mt-1 space-y-0.5">
								{#if item.cake_flavor}<div>{i18n.t('cart.flavor')}: {item.cake_flavor}</div>{/if}
								{#if item.cake_color}<div>{i18n.t('cart.color')}: {item.cake_color}</div>{/if}
								{#if item.has_cake_topper}<div>{i18n.t('cart.cakeTopper')}: {i18n.t('cart.yes')}</div>{/if}
								{#if item.cake_text}<div>{i18n.t('cart.text')}: {item.cake_text}</div>{/if}
							</div>
							
							<div class="mt-2 space-y-0.5 text-[11px] text-[#4A3B32]/55">
								{#if item.size_price}<div>{i18n.t('cart.size')}: {formatCurrency(item.size_price)}</div>{/if}
								{#if item.dark_color_surcharge}<div>{i18n.t('cart.darkColor')}: +{formatCurrency(item.dark_color_surcharge)}</div>{/if}
								{#if item.cake_topper_fee}<div>{i18n.t('cart.cakeTopper')}: +{formatCurrency(item.cake_topper_fee)}</div>{/if}
							</div>

							<div class="font-bold text-[#4A3B32] mt-3">
								{formatCurrency((item.estimated_unit_price || item.price_at_order || 0) * (item.quantity || 1))}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer -->
		{#if cart.items.length > 0}
			<div class="p-6 bg-[#FFFBF7] border-t border-primary/10 shadow-[0_-10px_20px_-10px_rgba(140,90,53,0.1)]">
				<div class="flex items-center justify-between mb-4">
					<span class="text-[#4A3B32]/70 font-medium text-sm">{i18n.t('pricing.estimatedTotal')}</span>
					<span class="text-2xl font-bold text-primary">{formatCurrency(cart.totalPrice)}</span>
				</div>
				<p class="mb-4 text-[11px] leading-relaxed text-[#4A3B32]/55">{i18n.t('pricing.finalInvoiceNote')}</p>
				<a href="/checkout" onclick={closeCart} class="block">
					<button class="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-[#724828] active:scale-[0.97] transition-[background-color,transform,box-shadow] duration-150 ease-out flex items-center justify-center gap-2">
						{i18n.t('cart.checkout')}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
					</button>
				</a>
			</div>
		{/if}
	</div>
{/if}
