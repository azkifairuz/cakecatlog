<script>
	import * as Select from '$lib/components/ui/select';
	import SelectValue from '$lib/components/ui/select/select-value.svelte';
	import { getImageUrl } from '$lib/image-url.js';
	import Loading from '$lib/components/Loading.svelte';
	import { uploadReferenceImage } from '$lib/api/upload.js';
	import { cart } from '$lib/stores/cart.svelte.js';
	import {
		getAddonSelectionPrice,
		getDynamicAddonGroups,
		getSizePriceOptions,
		getSizePrice,
		getStartFromPrice,
		parsePrice
	} from '$lib/pricing.js';
	import { getI18n } from '$lib/i18n.svelte.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Plus from '@lucide/svelte/icons/plus';
	import Minus from '@lucide/svelte/icons/minus';
	import Upload from '@lucide/svelte/icons/upload';
	import X from '@lucide/svelte/icons/x';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Info from '@lucide/svelte/icons/info';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Check from '@lucide/svelte/icons/check';
	import Cake from '@lucide/svelte/icons/cake';
	import { fade, scale } from 'svelte/transition';

	let { data } = $props();
	const i18n = getI18n();
	let product = $derived(data.product);

	// Sort images so primary is first
	let sortedImages = $derived(
		product.product_images?.slice().sort((a, b) => {
			if (a.is_primary) return -1;
			if (b.is_primary) return 1;
			return 0;
		}) || []
	);

	let activeImageIndex = $state(0);
	let activeImage = $derived(sortedImages[activeImageIndex] || sortedImages[0] || null);

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount || 0);
	}

	let sizePriceOptions = $derived(getSizePriceOptions(product));
	let addonGroups = $derived(getDynamicAddonGroups(product));
	let selectedAddonIds = $state({});
	let selectedAddons = $derived(
		addonGroups
			.map((group) => group.addons.find((addon) => addon.id === selectedAddonIds[group.key]))
			.filter(Boolean)
	);
	let selectedSize = $state(undefined);
	let quantity = $state(1);
	let startFromPrice = $derived(getStartFromPrice(product));
	let selectedSizeOption = $derived(sizePriceOptions.find((option) => option.label === selectedSize) ?? null);
	let selectedSizeAddon = $derived(selectedSizeOption?.addon ?? null);
	let selectedSizePrice = $derived(
		selectedSizeOption ? selectedSizeOption.price : selectedSize ? getSizePrice(product, selectedSize) : startFromPrice
	);
	let darkColorSurcharge = $derived(
		selectedAddons.reduce((sum, addon) => sum + (addon.is_dark_color ? parsePrice(addon.dark_color_surcharge) : 0), 0)
	);
	let addonUnitPrice = $derived(selectedAddons.reduce((sum, addon) => sum + getAddonSelectionPrice(addon), 0));
	let cakeTopperAddon = $derived(selectedAddons.find((addon) => addon.category_key === 'cake_topper') ?? null);
	let cakeTopperFee = $derived(cakeTopperAddon ? getAddonSelectionPrice(cakeTopperAddon) : 0);
	let estimatedUnitPrice = $derived(selectedSizePrice + addonUnitPrice);
	let estimatedSubtotal = $derived(estimatedUnitPrice * Math.max(Number(quantity) || 1, 1));

	let loading = $state(false);
	let errorMsg = $state('');
	let fileName = $state('');
	let filePreviewUrl = $state('');
	let selectedFile = $state(null);

	function handleFileChange(event) {
		const file = event.target.files?.[0];
		if (file) {
			selectedFile = file;
			fileName = file.name;
			filePreviewUrl = URL.createObjectURL(file);
		}
	}

	function removeFile() {
		if (filePreviewUrl) {
			URL.revokeObjectURL(filePreviewUrl);
		}
		selectedFile = null;
		fileName = '';
		filePreviewUrl = '';
	}

	function decrementQuantity() {
		if (quantity > 1) {
			quantity -= 1;
		}
	}

	function incrementQuantity() {
		quantity += 1;
	}

	async function handleAddToCart(event) {
		event.preventDefault();
		loading = true;
		errorMsg = '';

		const form = event.target;
		const formData = new FormData(form);

		try {
			let reference_image_url = null;

			// Upload reference image if selected
			if (selectedFile) {
				const uploadResult = await uploadReferenceImage(selectedFile);
				reference_image_url = uploadResult?.publicUrl || null;
			}

			// Construct cart item
			const addonOptions = selectedAddons.map((addon) => ({
				addon_id: addon.id,
				category: addon.category,
				category_key: addon.category_key,
				name: addon.name,
				price: getAddonSelectionPrice(addon)
			}));
			const optionFor = (key) => addonOptions.find((option) => option.category_key === key) ?? null;
			const customizedOptions = {
				size: selectedSize
					? {
							name: selectedSize,
							price: selectedSizePrice,
							variant_id: selectedSizeOption?.variant?.id ?? null,
							addon_id: selectedSizeAddon?.id ?? null
						}
					: null,
				addons: addonOptions,
				flavor: optionFor('flavor'),
				color: optionFor('color'),
				crown: optionFor('crown'),
				glitter: optionFor('glitter'),
				cake_topper: cakeTopperAddon ? { ...optionFor('cake_topper'), selected: true } : { selected: false, price: 0 }
			};
			const cartItem = {
				product_id: product.id,
				product_variant_id: selectedSizeOption?.variant?.id ?? null,
				product_name: product.name,
				primary_image: sortedImages[0]?.image_url || null,
				price_at_order: estimatedUnitPrice,
				base_price_at_order: parsePrice(product.base_price),
				size_price: selectedSizePrice,
				dark_color_surcharge: darkColorSurcharge,
				cake_topper_fee: cakeTopperFee,
				estimated_unit_price: estimatedUnitPrice,
				estimated_subtotal: estimatedSubtotal,
				has_cake_topper: Boolean(cakeTopperAddon),
				cake_size: formData.get('cake_size'),
				quantity: Math.max(parseInt(String(quantity), 10) || 1, 1),
				cake_flavor: optionFor('flavor')?.name || 'Standard',
				cake_color: optionFor('color')?.name || null,
				crown_option: optionFor('crown')?.name || null,
				add_edible_glitter: optionFor('glitter')?.name || null,
				customized_options: customizedOptions,
				cake_text: formData.get('add_on'),
				gift_card_text: formData.get('gift_card_text'),
				reference_image_url,
				cartItemId: crypto.randomUUID()
			};

			cart.addItem(cartItem);
			cart.isOpen = true;

			// Reset form state
			form.reset();
			removeFile();
			selectedSize = undefined;
			selectedAddonIds = {};
			quantity = 1;
		} catch (err) {
			console.error(err);
			errorMsg = err.message || i18n.t('product.addToCartError');
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{product.name} | dessertbyfir</title>
</svelte:head>

<div class="min-h-screen bg-[#FFFBF7] py-8 sm:py-12 lg:py-16 font-sans text-[#4A3B32]">
	<div class="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<!-- Navigation Breadcrumb & Back Button -->
		<div class="mb-8 flex items-center justify-between">
			<a
				href="/catalog"
				class="group inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-2 text-xs font-semibold text-[#4A3B32]/80 shadow-sm transition-[border-color,background-color,color,transform] duration-150 ease-out hover:border-primary/40 hover:bg-white hover:text-primary active:scale-[0.98]"
			>
				<ArrowLeft class="size-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
				<span>{i18n.t('product.backToCatalog')}</span>
			</a>
			<span class="font-pinyon text-2xl tracking-wider text-primary sm:text-3xl">dessertbyfir</span>
		</div>

		<!-- Main 2-Column Responsive Layout -->
		<div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
			<!-- LEFT COLUMN: Sticky Interactive Gallery + Description & Handling (lg:col-span-5) -->
			<div class="space-y-6 lg:col-span-5 lg:sticky lg:top-24">
				<!-- Hero Image Showcase -->
				<div class="relative overflow-hidden rounded-[2rem] border border-primary/10 bg-white p-3 shadow-sm sm:p-4">
					<div class="relative aspect-square w-full overflow-hidden rounded-[1.5rem] bg-[#FFFBF7]">
						{#if activeImage}
							<img
								src={getImageUrl(activeImage.image_url, { width: 1000, height: 1000, quality: 85, resize: 'cover' })}
								alt={product.name}
								class="size-full object-cover transition-transform duration-300 ease-out motion-safe:hover:scale-105"
								loading="eager"
								decoding="async"
							/>
						{:else}
							<div class="flex size-full flex-col items-center justify-center gap-2 text-center text-[#4A3B32]/40">
								<Cake class="size-10 text-primary/30" />
								<span class="text-xs font-medium">{i18n.t('product.noPhoto')}</span>
							</div>
						{/if}

						<!-- Floating Category Tag -->
						{#if product.category}
							<div class="absolute left-3.5 top-3.5 z-10 rounded-full bg-white/95 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary shadow-sm backdrop-blur-md">
								{product.category.name}
							</div>
						{/if}

						<!-- Availability Indicator -->
						<div class="absolute right-3.5 top-3.5 z-10 flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm backdrop-blur-md {product.is_available ? 'bg-emerald-500/90 text-white' : 'bg-slate-700/80 text-white'}">
							<span class="size-1.5 rounded-full bg-white animate-pulse"></span>
							<span>{product.is_available ? i18n.t('product.available') || 'Tersedia' : i18n.t('product.outOfStock')}</span>
						</div>
					</div>

					<!-- Thumbnails Strip (if > 1 image) -->
					{#if sortedImages.length > 1}
						<div class="mt-3 flex gap-2.5 overflow-x-auto px-1 pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
							{#each sortedImages as image, idx (image.id || image.image_url)}
								<button
									type="button"
									onclick={() => (activeImageIndex = idx)}
									class="relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-[border-color,box-shadow,transform,opacity] duration-150 ease-out active:scale-95 sm:size-18 {activeImageIndex === idx ? 'border-primary ring-2 ring-primary/20 shadow-sm opacity-100' : 'border-primary/15 opacity-60 hover:opacity-100 hover:border-primary/40'}"
									aria-label={`Lihat foto ${idx + 1}`}
								>
									<img
										src={getImageUrl(image.image_url, { width: 140, height: 140, quality: 75, resize: 'cover' })}
										alt={`${product.name} thumbnail ${idx + 1}`}
										class="size-full object-cover"
										loading="lazy"
										decoding="async"
									/>
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Product Story & Handling Info Card -->
				<div class="space-y-4 rounded-3xl border border-primary/10 bg-white p-6 shadow-sm sm:p-7">
					<div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
						<Sparkles class="size-3.5" />
						<span>{i18n.t('product.descriptionTitle')}</span>
					</div>

					<p class="whitespace-pre-line text-sm leading-relaxed text-[#4A3B32]/75 sm:text-[15px]">
						{product.description || i18n.t('product.fallbackDescription')}
					</p>

					{#if product.handling_warning}
						<div class="flex items-start gap-3.5 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-4">
							<Info class="mt-0.5 size-5 shrink-0 text-amber-600" />
							<div class="min-w-0">
								<h4 class="text-xs font-bold uppercase tracking-wide text-amber-900">
									{i18n.t('product.handlingInfo')}
								</h4>
								<p class="mt-0.5 text-xs leading-relaxed text-amber-800 sm:text-[13px]">
									{product.handling_warning}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- RIGHT COLUMN: Structured Modular Order Form (lg:col-span-7) -->
			<div class="space-y-6 lg:col-span-7">
				<!-- Header Title & Price Card -->
				<div class="space-y-3 rounded-3xl border border-primary/10 bg-white p-6 shadow-sm sm:p-8">
					{#if product.category}
						<span class="inline-block rounded-full bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
							{product.category.name}
						</span>
					{/if}

					<h1 class="font-serif text-3xl font-bold leading-tight text-[#4A3B32] sm:text-4xl lg:text-5xl">
						{product.name}
					</h1>

					<div class="flex flex-wrap items-baseline gap-3 pt-2">
						<span class="text-xs font-bold uppercase tracking-wider text-[#4A3B32]/50">
							{i18n.t('home.startFrom')}
						</span>
						<span class="text-3xl font-black text-primary sm:text-4xl">
							{formatCurrency(selectedSizePrice || startFromPrice)}
						</span>
						{#if selectedSize}
							<span class="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
								{selectedSize}
							</span>
						{/if}
					</div>
				</div>

				<!-- Customization Form -->
				<form onsubmit={handleAddToCart} class="space-y-6">
					{#if errorMsg}
						<div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600 shadow-sm" transition:fade={{ duration: 150 }}>
							{errorMsg}
						</div>
					{/if}

					<!-- STEP 1: Size & Quantity -->
					<section class="space-y-5 rounded-3xl border border-primary/10 bg-white p-6 shadow-sm sm:p-7">
						<div class="flex items-center gap-3 border-b border-primary/10 pb-4">
							<span class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
								1
							</span>
							<div>
								<h2 class="text-base font-bold text-[#4A3B32] sm:text-lg">
									{i18n.t('form.size')} & {i18n.t('form.quantity')}
								</h2>
								<p class="text-xs text-[#4A3B32]/60">Pilih varian ukuran diameter kue dan jumlah pemesanan</p>
							</div>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-12">
							<!-- Size Selection -->
							<div class="sm:col-span-7">
								<label for="cake_size" class="mb-2 block text-xs font-bold uppercase tracking-wider text-[#4A3B32]/80">
									{i18n.t('form.size')} <span class="text-red-500">*</span>
								</label>
								<Select.Root type="single" name="cake_size" required bind:value={selectedSize}>
									<Select.Trigger
										id="cake_size"
										class="h-12 w-full rounded-2xl border-primary/20 bg-[#FFFBF7] px-4 text-sm font-medium text-[#4A3B32] transition-[border-color,background-color,box-shadow] duration-150 hover:border-primary/40 hover:bg-white focus-visible:ring-primary/20"
									>
										<SelectValue placeholder={i18n.t('form.choose')} />
									</Select.Trigger>
									<Select.Content class="rounded-2xl border-primary/15 bg-white p-1.5 text-[#4A3B32] shadow-xl shadow-primary/10">
										{#each sizePriceOptions as sizeOption}
											<Select.Item
												value={sizeOption.label}
												label={`${sizeOption.label} — ${formatCurrency(sizeOption.price)}`}
												class="rounded-xl py-2.5 text-sm font-medium cursor-pointer"
											>
												<div class="flex w-full items-center justify-between gap-4">
													<span>{sizeOption.label}</span>
													<span class="font-bold text-primary">{formatCurrency(sizeOption.price)}</span>
												</div>
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							<!-- Quantity Stepper -->
							<div class="sm:col-span-5">
								<label for="quantity-display" class="mb-2 block text-xs font-bold uppercase tracking-wider text-[#4A3B32]/80">
									{i18n.t('form.quantity')} <span class="text-red-500">*</span>
								</label>
								<div class="flex h-12 items-center justify-between rounded-2xl border border-primary/20 bg-[#FFFBF7] p-1">
									<button
										type="button"
										onclick={decrementQuantity}
										disabled={quantity <= 1}
										class="flex size-10 items-center justify-center rounded-xl bg-white text-[#4A3B32] shadow-sm transition-[transform,background-color,color] duration-150 ease-out hover:bg-primary/10 hover:text-primary active:scale-90 disabled:pointer-events-none disabled:opacity-40"
										aria-label="Kurangi kuantitas"
									>
										<Minus class="size-4" />
									</button>
									<span id="quantity-display" class="select-none text-base font-bold text-[#4A3B32] tabular-nums">
										{quantity}
									</span>
									<button
										type="button"
										onclick={incrementQuantity}
										class="flex size-10 items-center justify-center rounded-xl bg-white text-[#4A3B32] shadow-sm transition-[transform,background-color,color] duration-150 ease-out hover:bg-primary hover:text-white active:scale-90"
										aria-label="Tambah kuantitas"
									>
										<Plus class="size-4" />
									</button>
								</div>
								<input type="hidden" name="quantity" value={quantity} />
							</div>
						</div>
					</section>

					<!-- STEP 2: Custom Addons (if available) -->
					{#if addonGroups.length > 0}
						<section class="space-y-5 rounded-3xl border border-primary/10 bg-white p-6 shadow-sm sm:p-7">
							<div class="flex items-center gap-3 border-b border-primary/10 pb-4">
								<span class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
									2
								</span>
								<div>
									<h2 class="text-base font-bold text-[#4A3B32] sm:text-lg">
										Kustomisasi & Add-ons
									</h2>
									<p class="text-xs text-[#4A3B32]/60">Pilih opsi lilin, pita, warna dasar, topper, atau dekorasi ekstra</p>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{#each addonGroups as group (group.key)}
									{@const selectedAddon = group.addons.find((addon) => addon.id === selectedAddonIds[group.key])}
									<div class="space-y-1.5">
										<label
											for={`addon-${group.key}`}
											class="block text-xs font-bold uppercase tracking-wider text-[#4A3B32]/80"
										>
											{group.label}
										</label>
										<Select.Root type="single" name={`addon_${group.key}`} bind:value={selectedAddonIds[group.key]} allowDeselect>
											<Select.Trigger
												id={`addon-${group.key}`}
												class="h-12 w-full rounded-2xl border-primary/20 bg-[#FFFBF7] px-4 text-sm font-medium text-[#4A3B32] transition-[border-color,background-color] duration-150 hover:border-primary/40 hover:bg-white focus-visible:ring-primary/20"
											>
												{#if selectedAddon}
													<SelectValue>{selectedAddon.name}</SelectValue>
												{:else}
													<SelectValue placeholder={i18n.t('form.choose')} />
												{/if}
											</Select.Trigger>
											<Select.Content class="rounded-2xl border-primary/15 bg-white p-1.5 text-[#4A3B32] shadow-xl shadow-primary/10">
												<Select.Group>
													{#each group.addons as addon (addon.id)}
														{@const selectionPrice = getAddonSelectionPrice(addon)}
														<Select.Item
															value={addon.id}
															label={addon.name}
															class="rounded-xl py-2.5 text-sm font-medium cursor-pointer"
														>
															<div class="flex w-full items-center justify-between gap-3">
																<span>{addon.name}</span>
																{#if selectionPrice > 0}
																	<span class="text-xs font-bold text-primary">+{formatCurrency(selectionPrice)}</span>
																{/if}
															</div>
														</Select.Item>
													{/each}
												</Select.Group>
											</Select.Content>
										</Select.Root>
									</div>
								{/each}
							</div>

							{#if darkColorSurcharge > 0}
								<div class="flex items-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900">
									<Info class="size-4 shrink-0 text-amber-600" />
									<span>
										Terdapat biaya tambahan warna pekat (<strong class="font-bold">{formatCurrency(darkColorSurcharge)}</strong>) untuk pigmen warna khusus.
									</span>
								</div>
							{/if}
						</section>
					{/if}

					<!-- STEP 3: Personalization & Reference Image -->
					<section class="space-y-5 rounded-3xl border border-primary/10 bg-white p-6 shadow-sm sm:p-7">
						<div class="flex items-center gap-3 border-b border-primary/10 pb-4">
							<span class="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-sm">
								{addonGroups.length > 0 ? 3 : 2}
							</span>
							<div>
								<h2 class="text-base font-bold text-[#4A3B32] sm:text-lg">
									Personalisasi & Referensi Desain
								</h2>
								<p class="text-xs text-[#4A3B32]/60">Tambahkan tulisan pada kue, pesan kartu ucapan, dan foto referensi</p>
							</div>
						</div>

						<div class="space-y-4">
							<!-- Cake Text -->
							<div>
								<label for="add_on" class="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4A3B32]/80">
									<Sparkles class="size-3.5 text-primary" />
									<span>{i18n.t('form.extraRequestCakeText')} (Opsional)</span>
								</label>
								<input
									type="text"
									id="add_on"
									name="add_on"
									placeholder={i18n.t('form.extraRequestPlaceholder') || 'Contoh: Happy 25th Birthday Amanda'}
									class="h-12 w-full rounded-2xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 transition-[border-color,background-color] duration-150 focus:border-primary focus:bg-white focus:outline-none"
								/>
							</div>

							<!-- Gift Card Message -->
							<div>
								<label for="gift_card_text" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#4A3B32]/80">
									{i18n.t('form.giftCard')} (Opsional)
								</label>
								<input
									type="text"
									id="gift_card_text"
									name="gift_card_text"
									placeholder={i18n.t('form.emptyGiftCard') || 'Pesan kartu ucapan (To: ... From: ...)'}
									class="h-12 w-full rounded-2xl border border-primary/20 bg-[#FFFBF7] px-4 text-sm text-[#4A3B32] placeholder-[#4A3B32]/40 transition-[border-color,background-color] duration-150 focus:border-primary focus:bg-white focus:outline-none"
								/>
							</div>

							<!-- Reference Image Upload Dropzone -->
							<div>
								<span class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#4A3B32]/80">
									{i18n.t('form.designReference')} (Opsional)
								</span>

								{#if filePreviewUrl}
									<div class="relative flex items-center gap-3.5 rounded-2xl border border-primary/25 bg-primary/5 p-3.5" transition:scale={{ start: 0.96, duration: 160 }}>
										<div class="size-14 shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-white shadow-sm">
											<img src={filePreviewUrl} alt="Preview referensi" class="size-full object-cover" />
										</div>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm font-bold text-[#4A3B32]">{fileName}</p>
											<p class="text-xs text-[#4A3B32]/60">Foto referensi siap dilampirkan</p>
										</div>
										<button
											type="button"
											onclick={removeFile}
											class="flex size-9 items-center justify-center rounded-xl bg-white text-[#4A3B32]/70 shadow-sm transition-[background-color,color,transform] duration-150 ease-out hover:bg-red-50 hover:text-red-600 active:scale-90"
											aria-label="Hapus foto referensi"
										>
											<X class="size-4" />
										</button>
									</div>
								{:else}
									<label
										class="group relative flex h-28 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-[#FFFBF7] transition-[border-color,background-color,transform] duration-150 ease-out hover:border-primary/45 hover:bg-primary/5 active:scale-[0.99]"
									>
										<div class="flex flex-col items-center justify-center px-4 py-3 text-center">
											<Upload class="mb-1.5 size-6 text-primary/50 transition-transform duration-200 group-hover:scale-110 group-hover:text-primary" />
											<p class="text-xs font-bold text-[#4A3B32]/80 group-hover:text-primary">
												{i18n.t('form.tapToUpload') || 'Klik untuk upload foto referensi desain'}
											</p>
											<p class="mt-0.5 text-[11px] text-[#4A3B32]/50">PNG, JPG atau WEBP (Maks 5MB)</p>
										</div>
										<input
											type="file"
											id="reference_image"
											name="reference_image"
											accept="image/*"
											class="hidden"
											onchange={handleFileChange}
										/>
									</label>
								{/if}
							</div>
						</div>
					</section>

					<!-- STEP 4: Live Price Summary & CTA Button -->
					<div class="space-y-4 rounded-3xl border border-primary/15 bg-gradient-to-br from-[#FFFBF7] to-white p-6 shadow-md shadow-primary/5 sm:p-7">
						<div class="flex items-center justify-between border-b border-primary/10 pb-4">
							<span class="text-xs font-bold uppercase tracking-wider text-[#4A3B32]/70">
								{i18n.t('pricing.estimateTitle')}
							</span>
							<span class="text-2xl font-black text-primary sm:text-3xl">
								{formatCurrency(estimatedSubtotal)}
							</span>
						</div>

						<div class="space-y-2 text-xs text-[#4A3B32]/70">
							<div class="flex justify-between gap-4">
								<span>{i18n.t('pricing.sizePrice')} ({selectedSize || 'Standard'})</span>
								<span class="font-semibold text-[#4A3B32]">{formatCurrency(selectedSizePrice)}</span>
							</div>

							{#if darkColorSurcharge > 0}
								<div class="flex justify-between gap-4">
									<span>{i18n.t('pricing.darkColorSurcharge')}</span>
									<span class="font-semibold text-[#4A3B32]">{formatCurrency(darkColorSurcharge)}</span>
								</div>
							{/if}

							{#if cakeTopperFee > 0}
								<div class="flex justify-between gap-4">
									<span>{i18n.t('pricing.cakeTopper')}</span>
									<span class="font-semibold text-[#4A3B32]">{formatCurrency(cakeTopperFee)}</span>
								</div>
							{/if}

							<div class="flex justify-between gap-4 border-t border-primary/10 pt-2 font-medium">
								<span>{i18n.t('pricing.qty')}</span>
								<span class="font-bold text-[#4A3B32]">{quantity}x</span>
							</div>
						</div>

						<p class="text-[11px] leading-relaxed text-[#4A3B32]/55">
							{i18n.t('pricing.finalInvoiceNote')}
						</p>

						<button
							type="submit"
							disabled={!product.is_available || loading}
							class="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-primary text-base font-bold text-white shadow-lg shadow-primary/25 transition-[background-color,transform,box-shadow,opacity] duration-160 ease-out hover:bg-[#724828] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if loading}
								<Loading label="" size="sm" class="text-white" />
							{:else}
								<ShoppingBag class="size-5" />
								<span>
									{product.is_available ? i18n.t('product.addToCart') : i18n.t('product.outOfStock')}
								</span>
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
