<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import * as Select from '$lib/components/ui/select';
	import SelectValue from '$lib/components/ui/select/select-value.svelte';
	import { getImageUrl } from '$lib/image-url.js';
	import Loading from '$lib/components/Loading.svelte';
	import PhoneNumberField from '$lib/components/PhoneNumberField.svelte';
	import {
		getAddonSelectionPrice,
		getDynamicAddonGroups,
		getSizePriceOptions,
		getSizePrice,
		getStartFromPrice,
		parsePrice
	} from '$lib/pricing.js';
	import { getI18n } from '$lib/i18n.svelte.js';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Cake from '@lucide/svelte/icons/cake';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Store from '@lucide/svelte/icons/store';
	import Truck from '@lucide/svelte/icons/truck';
	import Info from '@lucide/svelte/icons/info';
	import Upload from '@lucide/svelte/icons/upload';
	import Search from '@lucide/svelte/icons/search';

	let { data } = $props();
	const i18n = getI18n();

	let products = $derived(data.products ?? []);
	let globalAddons = $derived(data.globalAddons ?? []);
	let siteInfo = $derived(data.siteInfo);

	let selectedProductId = $state('');
	let selectedProduct = $derived(products.find((p) => p.id === selectedProductId) ?? products[0] ?? null);

	$effect(() => {
		if (!selectedProductId && (data.initialProductId || products[0]?.id)) {
			selectedProductId = data.initialProductId || products[0]?.id || '';
		}
	});

	let searchQuery = $state('');
	let isChangingProduct = $state(false);

	let filteredProducts = $derived(
		searchQuery.trim() === ''
			? products
			: products.filter(
					(p) =>
						p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
						p.categories?.name?.toLowerCase().includes(searchQuery.toLowerCase())
				)
	);

	// Pricing derivations
	let sizePriceOptions = $derived(selectedProduct ? getSizePriceOptions(selectedProduct) : []);
	let addonGroups = $derived(selectedProduct ? getDynamicAddonGroups(selectedProduct, globalAddons) : []);
	let selectedSize = $state(undefined);
	let selectedAddonIds = $state({});
	let quantity = $state(1);

	// Reset selections when product changes
	$effect(() => {
		if (selectedProductId) {
			const options = getSizePriceOptions(selectedProduct);
			selectedSize = options[0]?.label ?? undefined;
			selectedAddonIds = {};
			quantity = 1;
		}
	});

	let selectedSizeOption = $derived(sizePriceOptions.find((opt) => opt.label === selectedSize) ?? null);
	let selectedSizePrice = $derived(
		selectedSizeOption
			? selectedSizeOption.price
			: selectedSize
				? getSizePrice(selectedProduct, selectedSize)
				: getStartFromPrice(selectedProduct)
	);

	let selectedAddons = $derived(
		addonGroups
			.map((group) => group.addons.find((addon) => addon.id === selectedAddonIds[group.key]))
			.filter(Boolean)
	);

	let darkColorSurcharge = $derived(
		selectedAddons.reduce((sum, addon) => sum + (addon.is_dark_color ? parsePrice(addon.dark_color_surcharge) : 0), 0)
	);
	let addonUnitPrice = $derived(
		selectedAddons.reduce((sum, addon) => sum + getAddonSelectionPrice(addon), 0)
	);
	let cakeTopperAddon = $derived(selectedAddons.find((addon) => addon.category_key === 'cake_topper') ?? null);
	let cakeTopperFee = $derived(cakeTopperAddon ? getAddonSelectionPrice(cakeTopperAddon) : 0);

	let estimatedUnitPrice = $derived(selectedSizePrice + addonUnitPrice);
	let estimatedSubtotal = $derived(estimatedUnitPrice * Math.max(Number(quantity) || 1, 1));

	let primaryImage = $derived(
		selectedProduct?.product_images?.find((img) => img.is_primary)?.image_url ||
		selectedProduct?.product_images?.[0]?.image_url ||
		null
	);

	// Order submission state
	let deliveryOption = $state('delivery');
	let fileName = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	const d = new Date();
	const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount || 0);
	}

	function handleFormSubmit(event) {
		const form = event.target;
		const formData = new FormData(form);
		const selectedDate = formData.get('delivery_date');

		if (selectedDate && selectedDate < today) {
			event.preventDefault();
			errorMsg = i18n.t('checkout.datePastError');
			return;
		}

		if (deliveryOption === 'delivery' && !String(formData.get('delivery_time') || '').trim()) {
			event.preventDefault();
			errorMsg = i18n.t('server.deliveryTimeRequired');
			return;
		}

		if (deliveryOption === 'delivery' && !String(formData.get('address') || '').trim()) {
			event.preventDefault();
			errorMsg = i18n.t('server.deliveryAddressRequired');
			return;
		}

		loading = true;
	}
</script>

<svelte:head>
	<title>{i18n.t('orderForm.title')}</title>
	<meta name="description" content={i18n.t('orderForm.subtitle')} />
</svelte:head>

<div class="min-h-screen bg-[#FFFBF7] py-6 sm:py-12 font-sans text-[#4A3B32]">
	<div class="container mx-auto px-4 sm:px-6 max-w-5xl">
		<!-- Back Button & Header -->
		<div class="mb-8 flex items-center justify-between">
			<a
				href="/"
				class="inline-flex items-center gap-2 text-sm font-semibold text-[#4A3B32]/70 hover:text-primary transition-[color,transform] duration-150 active:scale-[0.97]"
			>
				<ArrowLeft class="size-4" />
				<span>{i18n.t('product.backToCatalog')}</span>
			</a>
			<span class="font-pinyon text-2xl tracking-wider text-primary sm:text-3xl">dessertbyfir</span>
		</div>

		<!-- Page Title Banner -->
		<div class="mb-8 rounded-3xl border border-primary/15 bg-white p-6 sm:p-8 shadow-sm shadow-primary/5 relative overflow-hidden">
			<div class="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
				<Cake class="size-56 text-primary" />
			</div>
			<div class="relative z-10 max-w-2xl">
				<div class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
					<Sparkles class="size-3.5" />
					<span>{i18n.t('orderForm.bannerDefault')}</span>
				</div>
				<h1 class="font-serif text-3xl font-bold tracking-tight text-[#4A3B32] sm:text-4xl">
					{i18n.t('orderForm.title').split('|')[0].trim()}
				</h1>
				<p class="mt-2 text-sm sm:text-base text-[#4A3B32]/70">
					{i18n.t('orderForm.subtitle')}
				</p>
			</div>
		</div>

		{#if errorMsg}
			<div class="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 shadow-sm" transition:fade={{ duration: 150 }}>
				{errorMsg}
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
			<!-- Main Form Section -->
			<div class="lg:col-span-8 space-y-6">
				<!-- 1. Product Selection Card -->
				<section class="rounded-3xl border border-primary/10 bg-white p-6 sm:p-8 shadow-sm">
					<div class="flex items-center justify-between border-b border-primary/10 pb-4 mb-6">
						<div class="flex items-center gap-2.5">
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">1</span>
							<h2 class="text-lg font-bold text-[#4A3B32]">{i18n.t('orderForm.selectCake')}</h2>
						</div>
						{#if selectedProduct && !isChangingProduct && products.length > 1}
							<button
								type="button"
								onclick={() => (isChangingProduct = true)}
								class="text-xs font-bold text-primary hover:underline transition-all"
							>
								{i18n.t('orderForm.changeCake')}
							</button>
						{/if}
					</div>

					{#if isChangingProduct || !selectedProduct}
						<div class="space-y-4" transition:slide={{ duration: 180 }}>
							<div class="relative">
								<Search class="absolute left-3.5 top-3.5 size-4 text-slate-400" />
								<input
									type="text"
									bind:value={searchQuery}
									placeholder={i18n.t('orderForm.searchCake')}
									class="w-full rounded-2xl border border-primary/20 bg-[#FFFBF7] py-3 pl-10 pr-4 text-sm text-[#4A3B32] focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>

							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
								{#each filteredProducts as prod (prod.id)}
									{@const img = prod.product_images?.find((i) => i.is_primary)?.image_url || prod.product_images?.[0]?.image_url}
									<button
										type="button"
										onclick={() => {
											selectedProductId = prod.id;
											isChangingProduct = false;
										}}
										class="flex items-center gap-3 rounded-2xl border p-3 text-left transition-all hover:border-primary hover:shadow-sm {selectedProductId === prod.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-primary/15 bg-white'}"
									>
										<div class="size-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-primary/10">
											{#if img}
												<img src={getImageUrl(img, { width: 100, height: 100, quality: 70 })} alt={prod.name} class="size-full object-cover" />
											{:else}
												<div class="size-full flex items-center justify-center text-xs text-[#4A3B32]/40">Kue</div>
											{/if}
										</div>
										<div class="min-w-0 flex-1">
											<p class="font-bold text-sm text-[#4A3B32] truncate">{prod.name}</p>
											<p class="text-xs text-primary font-semibold">{formatCurrency(getStartFromPrice(prod))}</p>
											{#if prod.categories?.name}
												<span class="inline-block mt-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
													{prod.categories.name}
												</span>
											{/if}
										</div>
									</button>
								{:else}
									<p class="col-span-2 text-center py-6 text-sm text-[#4A3B32]/50">{i18n.t('orderForm.noCakeFound')}</p>
								{/each}
							</div>
						</div>
					{:else}
						<!-- Selected Product Preview -->
						<div class="flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl bg-[#FFFBF7] p-4 sm:p-5 border border-primary/15">
							<div class="size-20 sm:size-24 rounded-2xl bg-white overflow-hidden shrink-0 border border-primary/10 shadow-sm">
								{#if primaryImage}
									<img src={getImageUrl(primaryImage, { width: 180, height: 180, quality: 80 })} alt={selectedProduct.name} class="size-full object-cover" />
								{:else}
									<div class="size-full flex items-center justify-center text-xs text-[#4A3B32]/40">No photo</div>
								{/if}
							</div>
							<div class="flex-1 min-w-0">
								{#if selectedProduct.categories?.name}
									<span class="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary mb-1">
										{selectedProduct.categories.name}
									</span>
								{/if}
								<h3 class="font-serif text-xl font-bold text-[#4A3B32] leading-snug">{selectedProduct.name}</h3>
								<p class="text-xs text-[#4A3B32]/60 mt-1 line-clamp-2">{selectedProduct.description || i18n.t('product.fallbackDescription')}</p>
								<div class="mt-2 flex items-baseline gap-2">
									<span class="text-[11px] uppercase font-bold text-[#4A3B32]/50">{i18n.t('home.startFrom')}</span>
									<span class="text-base font-extrabold text-primary">{formatCurrency(getStartFromPrice(selectedProduct))}</span>
								</div>
							</div>
						</div>

						{#if selectedProduct.handling_warning}
							<div class="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
								<Info class="size-4 text-amber-600 shrink-0 mt-0.5" />
								<div>
									<span class="font-bold">{i18n.t('product.handlingInfo')}:</span>
									<span>{selectedProduct.handling_warning}</span>
								</div>
							</div>
						{/if}
					{/if}
				</section>

				<!-- Actual Form -->
				<form
					id="direct-order-form"
					method="POST"
					action="?/order"
					use:enhance={() => {
						return async ({ result, update }) => {
							loading = false;
							if (result.type === 'success' && result.data?.success) {
								await goto(`/order/receipt/${result.data.orderId}`);
								return;
							} else if (result.type === 'success' && result.data?.error) {
								errorMsg = result.data.error;
							} else if (result.type === 'error' || result.type === 'failure') {
								errorMsg = result.data?.error || i18n.t('checkout.serverError');
							}
							await update();
						};
					}}
					onsubmit={handleFormSubmit}
					class="space-y-6"
				>
					<input type="hidden" name="product_id" value={selectedProductId} />
					<input type="hidden" name="locale" value={i18n.locale} />
					<input type="hidden" name="delivery_option" value={deliveryOption} />
					<input
						type="hidden"
						name="customized_options"
						value={JSON.stringify({
							size: selectedSize ? { name: selectedSize, price: selectedSizePrice, variant_id: selectedSizeOption?.id ?? null } : null,
							addons: selectedAddons.map((a) => ({ addon_id: a.id, category: a.category, category_key: a.category_key, name: a.name, price: getAddonSelectionPrice(a) }))
						})}
					/>

					<!-- 2. Cake Customization & Addons Card -->
					<section class="rounded-3xl border border-primary/10 bg-white p-6 sm:p-8 shadow-sm space-y-5">
						<div class="flex items-center gap-2.5 border-b border-primary/10 pb-4">
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">2</span>
							<h2 class="text-lg font-bold text-[#4A3B32]">{i18n.t('orderForm.cakeDetails')}</h2>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label for="cake_size" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.size')} <span class="text-red-500">*</span>
								</label>
								<Select.Root type="single" name="cake_size" required bind:value={selectedSize}>
									<Select.Trigger id="cake_size" class="h-11 w-full rounded-xl border-primary/20 bg-[#FFFBF7] px-3.5 text-sm text-[#4A3B32] hover:bg-white focus-visible:ring-primary/20">
										<SelectValue placeholder={i18n.t('form.choose')} />
									</Select.Trigger>
									<Select.Content class="rounded-xl border-primary/10 bg-white text-[#4A3B32] shadow-xl">
										{#each sizePriceOptions as option}
											<Select.Item value={option.label} label={`${option.label} - ${formatCurrency(option.price)}`}>
												{option.label} - {formatCurrency(option.price)}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							<div>
								<label for="quantity" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.quantity')} <span class="text-red-500">*</span>
								</label>
								<input
									type="number"
									id="quantity"
									name="quantity"
									min="1"
									bind:value={quantity}
									required
									class="h-11 w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-3 text-center text-sm font-semibold text-[#4A3B32] focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>
						</div>

						<!-- Dynamic Addons -->
						{#if addonGroups.length > 0}
							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
								{#each addonGroups as group (group.key)}
									{@const selectedAddon = group.addons.find((addon) => addon.id === selectedAddonIds[group.key])}
									<div>
										<label for={`addon_${group.key}`} class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
											{group.label}
										</label>
										<Select.Root type="single" name={`addon_${group.key}`} bind:value={selectedAddonIds[group.key]} allowDeselect>
											<Select.Trigger id={`addon_${group.key}`} class="h-11 w-full rounded-xl border-primary/20 bg-[#FFFBF7] px-3.5 text-sm text-[#4A3B32] hover:bg-white focus-visible:ring-primary/20">
												{#if selectedAddon}
													<SelectValue>{selectedAddon.name}</SelectValue>
												{:else}
													<SelectValue placeholder={i18n.t('form.choose')} />
												{/if}
											</Select.Trigger>
											<Select.Content class="rounded-xl border-primary/10 bg-white text-[#4A3B32] shadow-xl">
												<Select.Group>
													{#each group.addons as addon (addon.id)}
														{@const addonPrice = getAddonSelectionPrice(addon)}
														<Select.Item value={addon.id} label={addon.name}>
															{addon.name}{addonPrice > 0 ? ` (+${formatCurrency(addonPrice)})` : ''}
														</Select.Item>
													{/each}
												</Select.Group>
											</Select.Content>
										</Select.Root>
									</div>
								{/each}
							</div>
						{/if}

						<div class="space-y-4 pt-2">
							<div>
								<label for="gift_card_text" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.giftCard')}
								</label>
								<input
									type="text"
									id="gift_card_text"
									name="gift_card_text"
									placeholder={i18n.t('form.emptyGiftCard')}
									class="h-11 w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>

							<div>
								<label for="cake_text" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.extraRequestCakeText')}
								</label>
								<input
									type="text"
									id="cake_text"
									name="cake_text"
									placeholder={i18n.t('form.extraRequestPlaceholder')}
									class="h-11 w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>

							<div>
								<span class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.designReference')}
								</span>
								<label class="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-primary/20 rounded-2xl cursor-pointer bg-[#FFFBF7] hover:bg-primary/5 transition-all relative overflow-hidden group">
									{#if fileName}
										<div class="p-3 text-center">
											<CheckCircle2 class="size-6 text-emerald-600 mx-auto mb-1" />
											<p class="text-xs font-semibold text-[#4A3B32] truncate max-w-xs">{fileName}</p>
										</div>
									{:else}
										<div class="flex flex-col items-center justify-center p-4 text-center">
											<Upload class="size-6 text-primary/50 group-hover:scale-110 transition-transform mb-1" />
											<p class="text-xs font-semibold text-[#4A3B32]/70">{i18n.t('form.tapToUpload')}</p>
											<p class="text-[11px] text-[#4A3B32]/40 mt-0.5">{i18n.t('form.optional')}</p>
										</div>
									{/if}
									<input
										type="file"
										name="reference_image"
										accept="image/*"
										class="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
										onchange={(e) => (fileName = e.target.files[0]?.name || '')}
									/>
								</label>
							</div>
						</div>
					</section>

					<!-- 3. Delivery Method & Schedule Card -->
					<section class="rounded-3xl border border-primary/10 bg-white p-6 sm:p-8 shadow-sm space-y-5">
						<div class="flex items-center gap-2.5 border-b border-primary/10 pb-4">
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">3</span>
							<h2 class="text-lg font-bold text-[#4A3B32]">{i18n.t('orderForm.selectMethod')}</h2>
						</div>

						<!-- Delivery Option Segmented Control -->
						<div class="grid grid-cols-2 gap-3 p-1 rounded-2xl bg-[#FFFBF7] border border-primary/15">
							<button
								type="button"
								onclick={() => (deliveryOption = 'delivery')}
								class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] {deliveryOption === 'delivery' ? 'bg-primary text-white shadow-sm' : 'text-[#4A3B32]/70 hover:text-[#4A3B32]'}"
							>
								<Truck class="size-4" />
								<span>{i18n.t('checkout.delivery')}</span>
							</button>
							<button
								type="button"
								onclick={() => (deliveryOption = 'pickup')}
								class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] {deliveryOption === 'pickup' ? 'bg-primary text-white shadow-sm' : 'text-[#4A3B32]/70 hover:text-[#4A3B32]'}"
							>
								<Store class="size-4" />
								<span>{i18n.t('checkout.pickup')}</span>
							</button>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label for="delivery_date" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{deliveryOption === 'delivery' ? i18n.t('form.deliveryDate') : i18n.t('form.pickupDate')} <span class="text-red-500">*</span>
								</label>
								<input
									type="date"
									id="delivery_date"
									name="delivery_date"
									required
									min={today}
									class="h-11 w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>

							<div>
								<label for="delivery_time" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{deliveryOption === 'delivery' ? i18n.t('form.deliveryTime') : i18n.t('form.pickupTime')} {#if deliveryOption === 'delivery'}<span class="text-red-500">*</span>{/if}
								</label>
								<input
									type="time"
									id="delivery_time"
									name="delivery_time"
									required={deliveryOption === 'delivery'}
									class="h-11 w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>
						</div>

						{#if deliveryOption === 'delivery'}
							<div transition:slide={{ duration: 150 }}>
								<label for="address" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.fullAddress')} <span class="text-red-500">*</span>
								</label>
								<textarea
									id="address"
									name="address"
									rows="3"
									required
									placeholder={i18n.t('form.addressPlaceholder')}
									class="w-full rounded-xl border border-primary/20 bg-[#FFFBF7] p-4 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 focus:border-primary focus:bg-white focus:outline-none transition-colors resize-none"
								></textarea>
							</div>
						{:else}
							<div class="rounded-xl border border-primary/15 bg-[#FFFBF7] p-4 text-xs text-[#4A3B32]/75 space-y-1">
								<p class="font-bold text-[#4A3B32]">{i18n.t('footer.address')}:</p>
								<p class="whitespace-pre-line">{siteInfo?.address || 'Lokasi Toko'}</p>
								{#if siteInfo?.pickup_store_hours}
									<p class="pt-1 font-medium">{siteInfo.pickup_store_hours}</p>
								{/if}
							</div>
						{/if}
					</section>

					<!-- 4. Customer Contact Details Card -->
					<section class="rounded-3xl border border-primary/10 bg-white p-6 sm:p-8 shadow-sm space-y-5">
						<div class="flex items-center gap-2.5 border-b border-primary/10 pb-4">
							<span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">4</span>
							<h2 class="text-lg font-bold text-[#4A3B32]">{i18n.t('orderForm.personalData')}</h2>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label for="customer_name" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.fullName')} <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="customer_name"
									name="customer_name"
									required
									placeholder={i18n.t('form.fullNamePlaceholder')}
									class="h-11 w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>

							<div>
								<label for="email" class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32] mb-1.5">
									{i18n.t('form.email')} <span class="text-red-500">*</span>
								</label>
								<input
									type="email"
									id="email"
									name="email"
									required
									placeholder={i18n.t('form.emailPlaceholder')}
									class="h-11 w-full rounded-xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 focus:border-primary focus:bg-white focus:outline-none transition-colors"
								/>
							</div>

							<div class="sm:col-span-2">
								<PhoneNumberField
									locale={i18n.locale}
									label={i18n.t('form.whatsapp')}
									placeholder={i18n.t('form.whatsappPlaceholder')}
									description={i18n.t('form.whatsappDescription')}
									required
								/>
							</div>
						</div>
					</section>
				</form>
			</div>

			<!-- Right Sticky Summary Card -->
			<div class="lg:col-span-4">
				<aside class="sticky top-24 rounded-3xl border border-primary/15 bg-white p-6 shadow-md shadow-primary/5 space-y-5">
					<h3 class="font-serif text-xl font-bold text-[#4A3B32] border-b border-primary/10 pb-3">
						{i18n.t('checkout.orderSummary')}
					</h3>

					{#if selectedProduct}
						<div class="flex items-center gap-3">
							<div class="size-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-primary/10">
								{#if primaryImage}
									<img src={getImageUrl(primaryImage, { width: 100, height: 100, quality: 75 })} alt={selectedProduct.name} class="size-full object-cover" />
								{:else}
									<div class="size-full flex items-center justify-center text-[10px] text-[#4A3B32]/40">Kue</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<h4 class="font-bold text-sm text-[#4A3B32] truncate">{selectedProduct.name}</h4>
								<p class="text-xs text-[#4A3B32]/60">{selectedSize || 'Ukuran'}</p>
								<p class="text-xs font-semibold text-primary">{Math.max(Number(quantity) || 1, 1)}x @ {formatCurrency(estimatedUnitPrice)}</p>
							</div>
						</div>

						{#if selectedAddons.length > 0}
							<div class="rounded-xl bg-[#FFFBF7] p-3 text-xs space-y-1 border border-primary/10">
								<p class="font-bold text-[11px] uppercase tracking-wider text-[#4A3B32]/50">Kustomisasi:</p>
								{#each selectedAddons as addon}
									<div class="flex justify-between text-[#4A3B32]/80">
										<span>{addon.category}: {addon.name}</span>
										{#if getAddonSelectionPrice(addon) > 0}
											<span class="font-medium text-primary">+{formatCurrency(getAddonSelectionPrice(addon))}</span>
										{/if}
									</div>
								{/each}
							</div>
						{/if}

						<hr class="border-primary/10" />

						<div class="space-y-2 text-xs text-[#4A3B32]/70">
							<div class="flex justify-between">
								<span>{i18n.t('pricing.sizePrice')}</span>
								<span class="font-semibold text-[#4A3B32]">{formatCurrency(selectedSizePrice)}</span>
							</div>
							{#if darkColorSurcharge > 0}
								<div class="flex justify-between">
									<span>{i18n.t('pricing.darkColorSurcharge')}</span>
									<span class="font-semibold text-[#4A3B32]">{formatCurrency(darkColorSurcharge)}</span>
								</div>
							{/if}
							{#if cakeTopperFee > 0}
								<div class="flex justify-between">
									<span>{i18n.t('pricing.cakeTopper')}</span>
									<span class="font-semibold text-[#4A3B32]">{formatCurrency(cakeTopperFee)}</span>
								</div>
							{/if}
							<div class="flex justify-between">
								<span>{i18n.t('pricing.qty')}</span>
								<span class="font-semibold text-[#4A3B32]">{Math.max(Number(quantity) || 1, 1)}x</span>
							</div>
						</div>

						<div class="rounded-2xl bg-[#FFFBF7] p-4 border border-primary/15">
							<div class="flex items-center justify-between">
								<span class="text-xs font-bold uppercase tracking-wider text-[#4A3B32]/60">{i18n.t('pricing.estimatedTotal')}</span>
								<span class="text-xl font-black text-primary">{formatCurrency(estimatedSubtotal)}</span>
							</div>
						</div>

						<p class="text-[11px] leading-relaxed text-[#4A3B32]/50 text-center">
							{i18n.t('pricing.finalInvoiceNote')}
						</p>

						<button
							form="direct-order-form"
							type="submit"
							disabled={loading}
							class="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-[#724828] text-white font-bold text-sm tracking-wide shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-[background-color,transform,box-shadow,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{#if loading}
								<Loading label="" size="sm" class="text-white" />
								<span>{i18n.t('orderForm.submitting')}</span>
							{:else}
								<span>{i18n.t('orderForm.submitOrder')}</span>
							{/if}
						</button>
					{/if}
				</aside>
			</div>
		</div>
	</div>
</div>
