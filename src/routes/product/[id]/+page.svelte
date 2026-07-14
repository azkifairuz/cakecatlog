<script>
	import * as Carousel from '$lib/components/ui/carousel';
	import { getImageUrl } from '$lib/image-url.js';
	import { supabase } from '$lib/supabase';
	import { cart } from '$lib/stores/cart.svelte.js';
	import {
		getAddonsByCategory,
		getSizePriceOptions,
		getSizePrice,
		getStartFromPrice,
		parseCommaOptions,
		parsePrice
	} from '$lib/pricing.js';
	import { getI18n } from '$lib/i18n.svelte.js';
	
	let { data } = $props();
	const i18n = getI18n();
	let product = $derived(data.product);

	// Sort images so primary is first
	let sortedImages = $derived(
		product.product_images?.sort((a, b) => {
			if (a.is_primary) return -1;
			if (b.is_primary) return 1;
			return 0;
		}) || []
	);

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}

	let addonsByCategory = $derived(getAddonsByCategory(product));
	let sizePriceOptions = $derived(getSizePriceOptions(product));
	let colors = $derived(addonsByCategory.color?.length ? addonsByCategory.color : parseCommaOptions(product.colors).map((name) => ({ name, price: 0 })));
	let flavors = $derived(addonsByCategory.flavor?.length ? addonsByCategory.flavor : parseCommaOptions(product.flavors).map((name) => ({ name, price: 0 })));
	let crowns = $derived(addonsByCategory.crown?.length ? addonsByCategory.crown : parseCommaOptions(product.crown_options).map((name) => ({ name, price: 0 })));
	let glitters = $derived(addonsByCategory.glitter?.length ? addonsByCategory.glitter : parseCommaOptions(product.edible_glitter).map((name) => ({ name, price: 0 })));
	let cakeTopperAddon = $derived(addonsByCategory.cake_topper?.[0] ?? null);
	let selectedSize = $state('');
	let selectedColor = $state('');
	let selectedFlavor = $state('');
	let selectedCrown = $state('');
	let selectedGlitter = $state('');
	let quantity = $state(1);
	let hasCakeTopper = $state(false);
	let startFromPrice = $derived(getStartFromPrice(product));
	let selectedSizeAddon = $derived(sizePriceOptions.find((option) => option.label === selectedSize)?.addon ?? null);
	let selectedColorAddon = $derived(colors.find((addon) => addon.name === selectedColor) ?? null);
	let selectedFlavorAddon = $derived(flavors.find((addon) => addon.name === selectedFlavor) ?? null);
	let selectedCrownAddon = $derived(crowns.find((addon) => addon.name === selectedCrown) ?? null);
	let selectedGlitterAddon = $derived(glitters.find((addon) => addon.name === selectedGlitter) ?? null);
	let selectedSizePrice = $derived(selectedSizeAddon ? selectedSizeAddon.price : selectedSize ? getSizePrice(product, selectedSize) : startFromPrice);
	let darkColorSurcharge = $derived(selectedColorAddon?.is_dark_color ? parsePrice(selectedColorAddon.dark_color_surcharge) : 0);
	let cakeTopperFee = $derived(hasCakeTopper && cakeTopperAddon ? parsePrice(cakeTopperAddon.price) : 0);
	let addonUnitPrice = $derived(
		parsePrice(selectedFlavorAddon?.price) +
		parsePrice(selectedColorAddon?.price) +
		parsePrice(selectedCrownAddon?.price) +
		parsePrice(selectedGlitterAddon?.price)
	);
	let estimatedUnitPrice = $derived(selectedSizePrice + addonUnitPrice + darkColorSurcharge + cakeTopperFee);
	let estimatedSubtotal = $derived(estimatedUnitPrice * Math.max(Number(quantity) || 1, 1));

	let loading = $state(false);
	let errorMsg = $state('');
	let fileName = $state('');

	async function handleAddToCart(event) {
		event.preventDefault();
		loading = true;
		errorMsg = '';

		const form = event.target;
		const formData = new FormData(form);

		try {
			let reference_image_url = null;
			const file = formData.get('reference_image');

			// Upload reference image if exists
			if (file && file.size > 0) {
				const fileExt = file.name.split('.').pop();
				const uniqueName = `${Date.now()}-${Math.random()}.${fileExt}`;
				const filePath = `cust_reference/${uniqueName}`;

				const { error: uploadError } = await supabase.storage
					.from('products')
					.upload(filePath, file);

				if (uploadError) throw uploadError;

				const { data: publicUrlData } = supabase.storage
					.from('products')
					.getPublicUrl(filePath);
				
				reference_image_url = publicUrlData.publicUrl;
			}

			// Construct cart item
			const customizedOptions = {
				size: selectedSize ? { name: selectedSize, price: selectedSizePrice } : null,
				flavor: selectedFlavorAddon ? { name: selectedFlavorAddon.name, price: selectedFlavorAddon.price } : null,
				color: selectedColorAddon ? {
					name: selectedColorAddon.name,
					price: selectedColorAddon.price + darkColorSurcharge,
					is_dark_color: Boolean(selectedColorAddon.is_dark_color)
				} : null,
				crown: selectedCrownAddon ? { name: selectedCrownAddon.name, price: selectedCrownAddon.price } : null,
				glitter: selectedGlitterAddon ? { name: selectedGlitterAddon.name, price: selectedGlitterAddon.price } : null,
				cake_topper: hasCakeTopper && cakeTopperAddon
					? { selected: true, name: cakeTopperAddon.name, price: cakeTopperFee, addon_id: cakeTopperAddon.id }
					: { selected: false, price: 0 }
			};
			const cartItem = {
				product_id: product.id,
				product_name: product.name,
				primary_image: sortedImages[0]?.image_url || null,
				price_at_order: estimatedUnitPrice,
				base_price_at_order: parsePrice(product.base_price),
				size_price: selectedSizePrice,
				dark_color_surcharge: darkColorSurcharge,
				cake_topper_fee: cakeTopperFee,
				estimated_unit_price: estimatedUnitPrice,
				estimated_subtotal: estimatedSubtotal,
				has_cake_topper: hasCakeTopper && Boolean(cakeTopperAddon),
				cake_size: formData.get('cake_size'),
				quantity: Math.max(parseInt(formData.get('quantity')) || 1, 1),
				cake_flavor: formData.get('cake_flavor') || 'Standard',
				cake_color: formData.get('cake_color') || null,
				crown_option: formData.get('crown_option') || null,
				add_edible_glitter: formData.get('add_edible_glitter') || null,
				customized_options: customizedOptions,
				cake_text: formData.get('add_on'),
				gift_card_text: formData.get('gift_card_text'),
				reference_image_url
			};

			cart.addItem(cartItem);
			
			// Reset form
			form.reset();
			fileName = '';
			selectedSize = '';
			selectedColor = '';
			selectedFlavor = '';
			selectedCrown = '';
			selectedGlitter = '';
			quantity = 1;
			hasCakeTopper = false;

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

<div class="min-h-screen bg-[#FFFBF7] py-12 md:py-24 font-sans">
	<div class="container mx-auto px-6 max-w-6xl">
		<!-- Back Button -->
		<a href="/" class="inline-flex items-center gap-2 text-[#4A3B32]/70 hover:text-primary transition-colors font-medium mb-10 text-sm">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
			{i18n.t('product.backToCatalog')}
		</a>

		<div class="bg-white rounded-[2.5rem] shadow-xl shadow-primary/5 overflow-hidden flex flex-col md:flex-row items-stretch border border-primary/10">
			<!-- Image Gallery -->
			<div class="w-full md:w-1/2 bg-[#FFFBF7] p-6 md:p-8 flex items-center justify-center border-r border-primary/10">
				{#if sortedImages.length > 0}
					{#if sortedImages.length > 1}
						<Carousel.Root class="w-full max-w-sm mx-auto">
							<Carousel.Content>
								{#each sortedImages as image (image.image_url)}
									<Carousel.Item>
										<div class="aspect-square overflow-hidden rounded-[2rem] bg-white border border-primary/10 shadow-sm relative">
											<img src={getImageUrl(image.image_url, { width: 900, height: 900, quality: 82, resize: 'cover' })} alt={product.name} class="w-full h-full object-cover" loading="lazy" decoding="async" />
										</div>
									</Carousel.Item>
								{/each}
							</Carousel.Content>
							<div class="flex justify-center gap-2 mt-6">
								<Carousel.Previous class="static translate-y-0 h-10 w-10 border-primary text-primary hover:bg-primary hover:text-white transition-colors" />
								<Carousel.Next class="static translate-y-0 h-10 w-10 border-primary text-primary hover:bg-primary hover:text-white transition-colors" />
							</div>
						</Carousel.Root>
					{:else}
						<div class="aspect-square overflow-hidden rounded-[2rem] bg-white border border-primary/10 shadow-sm w-full max-w-sm mx-auto relative">
							<img src={getImageUrl(sortedImages[0].image_url, { width: 900, height: 900, quality: 82, resize: 'cover' })} alt={product.name} class="w-full h-full object-cover" decoding="async" />
						</div>
					{/if}
				{:else}
					<div class="aspect-square w-full max-w-sm mx-auto flex items-center justify-center rounded-[2rem] bg-white border border-dashed border-primary/20 text-[#4A3B32]/40 font-medium">
						{i18n.t('product.noPhoto')}
					</div>
				{/if}
			</div>

			<!-- Product Info & Add to Cart Form -->
			<div class="w-full md:w-1/2 p-8 md:p-12">
				<div>
					{#if product.category}
						<span class="inline-block px-4 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full mb-5 uppercase tracking-wider">
							{product.category.name}
						</span>
					{/if}
					
					<h1 class="text-4xl md:text-5xl font-bold text-[#4A3B32] mb-4 font-['Playfair_Display'] leading-tight">{product.name}</h1>
					<p class="mb-1 text-xs font-bold uppercase tracking-wider text-[#4A3B32]/45">{i18n.t('home.startFrom')}</p>
					<p class="text-3xl font-bold text-primary mb-8">{formatCurrency(startFromPrice)}</p>
				</div>

				<div class="mb-10 pb-8 border-b border-primary/10">
					<h3 class="text-sm font-bold text-[#4A3B32] uppercase tracking-wider mb-3">{i18n.t('product.descriptionTitle')}</h3>
					<p class="whitespace-pre-line text-[#4A3B32]/70 leading-relaxed text-[15px]">
						{product.description || i18n.t('product.fallbackDescription')}
					</p>
					
					{#if product.handling_warning}
						<div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
							<svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
							<div>
								<h4 class="text-[13px] font-bold text-amber-900 mb-0.5 uppercase tracking-wide">{i18n.t('product.handlingInfo')}</h4>
								<p class="text-[13px] text-amber-800 leading-relaxed">{product.handling_warning}</p>
							</div>
						</div>
					{/if}
				</div>

				<!-- Form Add to Cart -->
				<form onsubmit={handleAddToCart} class="space-y-6">
					{#if errorMsg}
						<div class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
							{errorMsg}
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="cake_size" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.size')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
							<div class="relative">
								<select id="cake_size" name="cake_size" required bind:value={selectedSize} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-primary transition-all text-[#4A3B32]">
									<option value="" disabled>{i18n.t('form.choose')}</option>
									{#each sizePriceOptions as sizeOption}
										<option value={sizeOption.label}>{sizeOption.label} - {formatCurrency(sizeOption.price)}</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary/50">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
						<div>
							<label for="quantity" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.quantity')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
							<input type="number" id="quantity" name="quantity" min="1" bind:value={quantity} required class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] focus:outline-none focus:border-primary transition-all text-center text-[#4A3B32]" />
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#if flavors.length > 0}
							<div>
								<label for="cake_flavor" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.flavor')}</label>
								<div class="relative">
									<select id="cake_flavor" name="cake_flavor" bind:value={selectedFlavor} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-primary transition-all text-[#4A3B32]">
										<option value="" selected>{i18n.t('form.chooseFlavor')}</option>
										{#each flavors as flavor}
											<option value={flavor.name}>{flavor.name}{flavor.price > 0 ? ` (+${formatCurrency(flavor.price)})` : ''}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{/if}

						{#if colors.length > 0}
							<div>
								<label for="cake_color" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.color')}</label>
								<div class="relative">
									<select id="cake_color" name="cake_color" bind:value={selectedColor} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-primary transition-all text-[#4A3B32]">
										<option value="">{i18n.t('form.chooseColor')}</option>
										{#each colors as color}
											<option value={color.name}>{color.name}{color.price + (color.is_dark_color ? parsePrice(color.dark_color_surcharge) : 0) > 0 ? ` (+${formatCurrency(color.price + (color.is_dark_color ? parsePrice(color.dark_color_surcharge) : 0))})` : ''}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{/if}

						{#if crowns.length > 0}
							<div>
								<label for="crown_option" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.crown')}</label>
								<div class="relative">
									<select id="crown_option" name="crown_option" bind:value={selectedCrown} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-primary transition-all text-[#4A3B32]">
										<option value="" selected>{i18n.t('form.chooseCrown')}</option>
										{#each crowns as crown}
											<option value={crown.name}>{crown.name}{crown.price > 0 ? ` (+${formatCurrency(crown.price)})` : ''}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{/if}

						{#if glitters.length > 0}
							<div>
								<label for="add_edible_glitter" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.glitter')}</label>
								<div class="relative">
									<select id="add_edible_glitter" name="add_edible_glitter" bind:value={selectedGlitter} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-primary transition-all text-[#4A3B32]">
										<option value="" selected>{i18n.t('form.chooseGlitter')}</option>
										{#each glitters as glitter}
											<option value={glitter.name}>{glitter.name}{glitter.price > 0 ? ` (+${formatCurrency(glitter.price)})` : ''}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-primary/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{:else}
							<div>
								<label for="add_edible_glitter" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.extraGlitter')}</label>
								<input type="text" id="add_edible_glitter" name="add_edible_glitter" placeholder={i18n.t('form.extraGlitterPlaceholder')} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-primary transition-all text-[#4A3B32]" />
							</div>
						{/if}
					</div>

					{#if cakeTopperAddon}
						<div>
							<label class="flex items-start gap-3 rounded-xl border border-primary/15 bg-[#FFFBF7] p-4">
								<input type="checkbox" name="has_cake_topper" bind:checked={hasCakeTopper} class="mt-1 h-4 w-4 rounded border-primary/30 text-primary" />
								<span>
									<span class="block text-[12px] font-bold uppercase tracking-wide text-[#4A3B32]">{cakeTopperAddon.name}</span>
									<span class="mt-0.5 block text-sm text-[#4A3B32]/65">{i18n.t('form.cakeTopperFee', { price: formatCurrency(cakeTopperAddon.price) })}</span>
								</span>
							</label>
						</div>
					{/if}

					<div>
						<label for="gift_card_text" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.giftCard')}</label>
						<input type="text" id="gift_card_text" name="gift_card_text" placeholder={i18n.t('form.emptyGiftCard')} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-primary transition-all text-[#4A3B32]" />
					</div>
					<div>
						<label for="add_on" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.extraRequestCakeText')}</label>
						<input type="text" id="add_on" name="add_on" placeholder={i18n.t('form.extraRequestPlaceholder')} class="w-full px-4 py-3 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-primary transition-all text-[#4A3B32]" />
					</div>

					<div>
						<div class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.designReference')}</div>
						<label class="flex flex-col items-center justify-center w-full h-32 border border-primary/20 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-primary/5 transition-all group overflow-hidden relative">
							{#if fileName}
								<div class="absolute inset-0 bg-primary/10 flex items-center justify-center p-4">
									<span class="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-[#4A3B32] truncate max-w-[90%] border border-primary/20">{fileName}</span>
								</div>
							{:else}
								<div class="flex flex-col items-center justify-center pt-5 pb-6">
									<svg class="w-7 h-7 mb-2.5 text-primary/40 group-hover:text-primary/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
									<p class="text-sm text-[#4A3B32]/60 font-medium">{i18n.t('form.tapToUpload')}</p>
								</div>
							{/if}
							<input type="file" id="reference_image" name="reference_image" accept="image/*" class="hidden" onchange={(e) => fileName = e.target.files[0]?.name || ''} />
						</label>
					</div>

					<div class="rounded-2xl border border-primary/15 bg-[#FFFBF7] p-4">
						<div class="mb-3 flex items-center justify-between">
							<span class="text-[12px] font-bold uppercase tracking-wide text-[#4A3B32]/70">{i18n.t('pricing.estimateTitle')}</span>
							<span class="text-lg font-black text-primary">{formatCurrency(estimatedSubtotal)}</span>
						</div>
						<div class="space-y-1.5 text-xs text-[#4A3B32]/65">
							<div class="flex justify-between gap-4">
								<span>{i18n.t('pricing.sizePrice')}</span>
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
							<div class="flex justify-between gap-4 border-t border-primary/10 pt-1.5">
								<span>{i18n.t('pricing.qty')}</span>
								<span class="font-semibold text-[#4A3B32]">{Math.max(Number(quantity) || 1, 1)}x</span>
							</div>
						</div>
						<p class="mt-3 text-[11px] leading-relaxed text-[#4A3B32]/55">{i18n.t('pricing.finalInvoiceNote')}</p>
					</div>

					<button 
						type="submit"
						disabled={!product.is_available || loading}
						class="w-full py-4 mt-6 bg-primary text-white rounded-full font-bold text-[15px] hover:bg-[#724828] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{#if loading}
							<span class="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
						{/if}
						{product.is_available ? i18n.t('product.addToCart') : i18n.t('product.outOfStock')}
					</button>
				</form>
				
			</div>
		</div>
	</div>
</div>
