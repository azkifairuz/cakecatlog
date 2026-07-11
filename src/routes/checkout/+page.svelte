<script>
	import { getImageUrl } from '$lib/image-url.js';
	import { cart } from '$lib/stores/cart.svelte.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { getI18n } from '$lib/i18n.svelte.js';
	
	let { form } = $props();
	const i18n = getI18n();
	let mounted = $state(false);
	let showSuccessModal = $state(false);
	let selectedDeliveryOption = $state('');
	
	onMount(() => {
		mounted = true;
		if (cart.items.length === 0) {
			goto('/');
		}
	});

	let loading = $state(false);
	let errorMsg = $state('');
	
	const d = new Date();
	const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}
	


	function handleSubmit(event) {
		const formData = new FormData(event.target);
		const selectedDate = formData.get('delivery_date');
		if (selectedDate && selectedDate < today) {
			event.preventDefault();
			errorMsg = i18n.t('checkout.datePastError');
			return;
		}

		if (selectedDeliveryOption === 'delivery' && !String(formData.get('delivery_time') || '').trim()) {
			event.preventDefault();
			errorMsg = i18n.t('server.deliveryTimeRequired');
			return;
		}

		if (selectedDeliveryOption === 'delivery' && !String(formData.get('address') || '').trim()) {
			event.preventDefault();
			errorMsg = i18n.t('server.deliveryAddressRequired');
			return;
		}

		loading = true;
	}
</script>

<svelte:head>
	<title>{i18n.t('checkout.title')}</title>
</svelte:head>

<div class="min-h-screen bg-[#FFFBF7] py-8 md:py-16 font-sans">
	<div class="container mx-auto px-6 max-w-5xl">
		<!-- Back Button -->
		<a href="/" class="inline-flex items-center gap-2 text-[#4A3B32]/70 hover:text-primary transition-colors font-medium mb-8 text-sm">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
			{i18n.t('checkout.back')}
		</a>

		<div class="flex flex-col lg:flex-row gap-8">
			<!-- Form Info Pemesan -->
			<div class="w-full lg:w-2/3">
				<div class="bg-white rounded-3xl p-8 border border-primary/10 shadow-sm">
					<h2 class="text-2xl font-bold text-[#4A3B32] font-['Playfair_Display'] mb-6">
						{selectedDeliveryOption ? (selectedDeliveryOption === 'delivery' ? i18n.t('checkout.shippingInfo') : i18n.t('checkout.pickupInfo')) : i18n.t('checkout.deliveryOptionTitle')}
					</h2>
					
					{#if errorMsg}
						<div class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 mb-6">
							{errorMsg}
						</div>
					{/if}

					{#if !selectedDeliveryOption}
						<div class="grid gap-4 sm:grid-cols-2">
							<button
								type="button"
								onclick={() => {
									selectedDeliveryOption = 'pickup';
									errorMsg = '';
								}}
								class="group flex min-h-44 flex-col items-start justify-between rounded-2xl border border-primary/15 bg-[#FFFBF7] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
							>
								<span class="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
									<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 21h18M5 21V7l8-4 6 4v14M9 21v-8h6v8M9 9h.01M15 9h.01"></path></svg>
								</span>
								<span>
									<span class="block text-lg font-extrabold text-[#4A3B32]">{i18n.t('checkout.pickup')}</span>
									<span class="mt-1 block text-sm leading-relaxed text-[#4A3B32]/60">{i18n.t('checkout.pickupDescription')}</span>
								</span>
							</button>

							<button
								type="button"
								onclick={() => {
									selectedDeliveryOption = 'delivery';
									errorMsg = '';
								}}
								class="group flex min-h-44 flex-col items-start justify-between rounded-2xl border border-primary/15 bg-[#FFFBF7] p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lg hover:shadow-primary/10"
							>
								<span class="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-primary shadow-sm">
									<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 17h8M8 17a2 2 0 11-4 0m4 0a2 2 0 10-4 0m12 0a2 2 0 114 0m-4 0a2 2 0 104 0M3 6h11v11H6M14 8h3l4 4v5h-2M5 11h4"></path></svg>
								</span>
								<span>
									<span class="block text-lg font-extrabold text-[#4A3B32]">{i18n.t('checkout.delivery')}</span>
									<span class="mt-1 block text-sm leading-relaxed text-[#4A3B32]/60">{i18n.t('checkout.deliveryDescription')}</span>
								</span>
							</button>
						</div>
					{:else}
					<form method="POST" action="?/checkout" use:enhance={() => {
						return async ({ result, update }) => {
							loading = false;
							if (result.type === 'success' && result.data?.success) {
								cart.clear();
								showSuccessModal = true;
							} else if (result.type === 'success' && result.data?.error) {
								errorMsg = result.data.error;
							} else if (result.type === 'error' || result.type === 'failure') {
								errorMsg = result.data?.error || i18n.t('checkout.serverError');
							}
							await update();
						};
					}} onsubmit={handleSubmit} class="space-y-6">
						<!-- Hidden input for cart items -->
						<input type="hidden" name="cart_items" value={JSON.stringify(cart.items)} />
						<input type="hidden" name="total_price" value={cart.totalPrice} />
						<input type="hidden" name="locale" value={i18n.locale} />
						<input type="hidden" name="delivery_option" value={selectedDeliveryOption} />

						<div class="flex items-center justify-between gap-3 rounded-2xl bg-[#FFFBF7] px-4 py-3 border border-primary/10">
							<div>
								<p class="text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]/50">{i18n.t('checkout.method')}</p>
								<p class="text-sm font-bold text-[#4A3B32]">{selectedDeliveryOption === 'delivery' ? i18n.t('checkout.delivery') : i18n.t('checkout.pickup')}</p>
							</div>
							<button
								type="button"
								onclick={() => {
									selectedDeliveryOption = '';
									errorMsg = '';
								}}
								class="rounded-full border border-primary/20 px-4 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
							>
								{i18n.t('checkout.changeDeliveryOption')}
							</button>
						</div>

						<div class="grid md:grid-cols-2 gap-6">
							<div>
								<label for="customer_name" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.fullName')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
								<input type="text" id="customer_name" name="customer_name" required placeholder={i18n.t('form.fullNamePlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-primary transition-all" />
							</div>
							<div>
								<label for="email" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.email')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
								<input type="email" id="email" name="email" required placeholder={i18n.t('form.emailPlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-primary transition-all" />
							</div>
							<div class="md:col-span-2">
								<label for="phone_number" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.whatsapp')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
								<input type="tel" inputmode="numeric" pattern="[0-9]*" oninput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} id="phone_number" name="phone_number" required placeholder={i18n.t('form.whatsappPlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-primary transition-all" />
							</div>
						</div>

						<div class="grid md:grid-cols-2 gap-6">
							<div>
								<label for="delivery_date" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{selectedDeliveryOption === 'delivery' ? i18n.t('form.deliveryDate') : i18n.t('form.pickupDate')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
								<input type="date" id="delivery_date" name="delivery_date" required min={today} class="w-full px-4 py-3.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] text-[#4A3B32] focus:outline-none focus:border-primary transition-all cursor-pointer" />
							</div>
							<div>
								<label for="delivery_time" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{selectedDeliveryOption === 'delivery' ? i18n.t('form.deliveryTime') : i18n.t('form.pickupTime')} {#if selectedDeliveryOption === 'delivery'}<span class="text-red-400">{i18n.t('form.required')}</span>{/if}</label>
								<input type="time" id="delivery_time" name="delivery_time" required={selectedDeliveryOption === 'delivery'} class="w-full px-4 py-3.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] text-[#4A3B32] focus:outline-none focus:border-primary transition-all cursor-pointer" />
							</div>
						</div>

						{#if selectedDeliveryOption === 'delivery'}
							<div>
								<label for="address" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.fullAddress')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
								<textarea id="address" name="address" required placeholder={i18n.t('form.addressPlaceholder')} rows="3" class="w-full px-4 py-3.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-primary transition-all resize-none"></textarea>
							</div>
						{/if}

						<div class="pt-6">
							<button type="submit" disabled={loading || cart.items.length === 0} class="w-full py-4 bg-primary hover:bg-[#724828] active:scale-[0.99] text-white font-bold text-[16px] tracking-wide rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
								{#if loading}
									<span class="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span>
								{/if}
								{i18n.t('checkout.sendOrder')}
							</button>
						</div>
					</form>
					{/if}
				</div>
			</div>

			<!-- Summary Keranjang -->
			<div class="w-full lg:w-1/3">
				<div class="bg-white rounded-3xl p-6 border border-primary/10 shadow-sm sticky top-24">
					<h3 class="text-lg font-bold text-[#4A3B32] mb-6">{i18n.t('checkout.orderSummary')}</h3>

					{#if selectedDeliveryOption}
						<div class="mb-5 rounded-2xl bg-[#FFFBF7] px-4 py-3 border border-primary/10">
							<p class="text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]/50">{i18n.t('checkout.method')}</p>
							<p class="text-sm font-bold text-[#4A3B32]">{selectedDeliveryOption === 'delivery' ? i18n.t('checkout.delivery') : i18n.t('checkout.pickup')}</p>
						</div>
					{/if}
					
					{#if mounted}
						<div class="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
							{#each cart.items as item}
								<div class="flex gap-4">
									<div class="w-16 h-16 rounded-lg bg-slate-50 border border-primary/10 overflow-hidden flex-shrink-0">
										{#if item.primary_image}
											<img src={getImageUrl(item.primary_image, { width: 128, height: 128, quality: 75, resize: 'cover' })} alt={item.product_name} class="w-full h-full object-cover" loading="lazy" decoding="async" />
										{/if}
									</div>
									<div class="flex-1 min-w-0">
										<h4 class="font-bold text-sm text-[#4A3B32] truncate">{item.product_name}</h4>
										<p class="text-xs text-[#4A3B32]/70 mt-0.5">{item.quantity}x @ {formatCurrency(item.estimated_unit_price || item.price_at_order)}</p>
										{#if item.cake_color || item.has_cake_topper}
											<p class="mt-0.5 text-[11px] text-[#4A3B32]/50">
												{#if item.cake_color}{i18n.t('checkout.color')}: {item.cake_color}{/if}{item.cake_color && item.has_cake_topper ? ' • ' : ''}{#if item.has_cake_topper}{i18n.t('checkout.cakeTopper')}{/if}
											</p>
										{/if}
										<div class="text-xs font-semibold text-primary mt-1">{formatCurrency((item.estimated_unit_price || item.price_at_order) * item.quantity)}</div>
									</div>
								</div>
							{/each}
						</div>

						<div class="border-t border-primary/10 pt-4 flex items-center justify-between">
							<span class="font-medium text-[#4A3B32]">{i18n.t('pricing.estimatedTotal')}</span>
							<span class="text-xl font-bold text-primary">{formatCurrency(cart.totalPrice)}</span>
						</div>
						<p class="mt-3 text-[11px] leading-relaxed text-[#4A3B32]/55">{i18n.t('pricing.finalInvoiceNote')}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

{#if showSuccessModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
		<div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-200">
			<div class="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-5 border-[6px] border-green-50/50">
				<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
				</svg>
			</div>
			<h3 class="text-2xl font-bold text-slate-800 mb-2">{i18n.t('checkout.successTitle')}</h3>
			<p class="text-slate-500 text-[15px] mb-8 leading-relaxed">{i18n.t('checkout.successDescription')}</p>
			<a href="/" class="block w-full py-4 bg-primary hover:bg-[#724828] text-white font-semibold rounded-xl transition-all shadow-md">
				{i18n.t('checkout.backHome')}
			</a>
		</div>
	</div>
{/if}
