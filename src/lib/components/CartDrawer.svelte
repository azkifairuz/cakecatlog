<script>
	import { cart } from '$lib/stores/cart.svelte.js';
	import { fly, fade } from 'svelte/transition';
	
	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}
	
	function closeCart() {
		cart.isOpen = false;
	}
</script>

{#if cart.isOpen}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
		transition:fade={{ duration: 200 }}
		onclick={closeCart}
	></div>
	
	<!-- Drawer -->
	<div 
		class="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
		transition:fly={{ x: '100%', duration: 300, opacity: 1 }}
	>
		<!-- Header -->
		<div class="px-6 py-5 border-b border-[#8C5A35]/10 flex items-center justify-between bg-[#FFFBF7]">
			<h2 class="text-xl font-bold text-[#4A3B32] font-['Playfair_Display']">Keranjang Belanja</h2>
			<button 
				onclick={closeCart}
				class="p-2 text-[#4A3B32]/50 hover:text-[#8C5A35] hover:bg-[#8C5A35]/10 rounded-full transition-colors"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
			</button>
		</div>

		<!-- Items -->
		<div class="flex-1 overflow-y-auto p-6 space-y-6">
			{#if cart.items.length === 0}
				<div class="h-full flex flex-col items-center justify-center text-center opacity-50">
					<svg class="w-16 h-16 mb-4 text-[#8C5A35]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
					<p class="text-lg font-medium text-[#4A3B32]">Keranjang Anda masih kosong</p>
					<p class="text-sm mt-2">Mari mulai berbelanja kue favorit Anda!</p>
				</div>
			{:else}
				{#each cart.items as item (item.cartItemId)}
					<div class="flex gap-4 p-4 rounded-2xl border border-[#8C5A35]/10 bg-slate-50 relative group">
						<button 
							onclick={() => cart.removeItem(item.cartItemId)}
							class="absolute -top-2 -right-2 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
							title="Hapus Item"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
						</button>
						
						<div class="w-20 h-20 rounded-xl bg-white border border-[#8C5A35]/10 overflow-hidden flex-shrink-0">
							{#if item.primary_image}
								<img src={item.primary_image} alt={item.product_name} class="w-full h-full object-cover" />
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
							
							<div class="text-xs text-[#8C5A35] mt-1 space-y-0.5">
								{#if item.cake_flavor}<div>Rasa: {item.cake_flavor}</div>{/if}
								{#if item.cake_text}<div>Tulisan: {item.cake_text}</div>{/if}
							</div>
							
							<div class="font-bold text-[#4A3B32] mt-3">
								{formatCurrency((item.price_at_order || 0) * (item.quantity || 1))}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Footer -->
		{#if cart.items.length > 0}
			<div class="p-6 bg-[#FFFBF7] border-t border-[#8C5A35]/10 shadow-[0_-10px_20px_-10px_rgba(140,90,53,0.1)]">
				<div class="flex items-center justify-between mb-4">
					<span class="text-[#4A3B32]/70 font-medium text-sm">Total Belanja</span>
					<span class="text-2xl font-bold text-[#8C5A35]">{formatCurrency(cart.totalPrice)}</span>
				</div>
				<a href="/checkout" onclick={closeCart} class="block">
					<button class="w-full py-4 bg-[#8C5A35] text-white font-bold rounded-xl shadow-lg shadow-[#8C5A35]/20 hover:bg-[#724828] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
						Lanjut Checkout
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
					</button>
				</a>
			</div>
		{/if}
	</div>
{/if}
