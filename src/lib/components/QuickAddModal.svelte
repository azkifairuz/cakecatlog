<script>
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import * as Select from '$lib/components/ui/select';
	import SelectValue from '$lib/components/ui/select/select-value.svelte';
	import { getImageUrl } from '$lib/image-url.js';
	import Loading from '$lib/components/Loading.svelte';
	import { cart } from '$lib/stores/cart.svelte.js';
	import { supabase } from '$lib/supabase';
	import {
		getAddonsByCategory,
		getSizePriceOptions,
		getSizePrice,
		getStartFromPrice,
		parseCommaOptions,
		parsePrice
	} from '$lib/pricing.js';
	import { getI18n } from '$lib/i18n.svelte.js';

	let { isOpen = $bindable(false), product = null } = $props();
	const i18n = getI18n();

	let loading = $state(false);
	let errorMsg = $state('');
	let fileName = $state('');
	let selectedSize = $state(undefined);
	let selectedColor = $state(undefined);
	let selectedFlavor = $state(undefined);
	let selectedCrown = $state(undefined);
	let selectedGlitter = $state(undefined);
	let quantity = $state(1);
	let hasCakeTopper = $state(false);

	let addonsByCategory = $derived(getAddonsByCategory(product));
	let sizePriceOptions = $derived(getSizePriceOptions(product));
	let colors = $derived(addonsByCategory.color?.length ? addonsByCategory.color : parseCommaOptions(product?.colors).map((name) => ({ name, price: 0 })));
	let flavors = $derived(addonsByCategory.flavor?.length ? addonsByCategory.flavor : parseCommaOptions(product?.flavors).map((name) => ({ name, price: 0 })));
	let crowns = $derived(addonsByCategory.crown?.length ? addonsByCategory.crown : parseCommaOptions(product?.crown_options).map((name) => ({ name, price: 0 })));
	let glitters = $derived(addonsByCategory.glitter?.length ? addonsByCategory.glitter : parseCommaOptions(product?.edible_glitter).map((name) => ({ name, price: 0 })));
	let cakeTopperAddon = $derived(addonsByCategory.cake_topper?.[0] ?? null);
	let startFromPrice = $derived(getStartFromPrice(product));
	let selectedSizeOption = $derived(sizePriceOptions.find((option) => option.label === selectedSize) ?? null);
	let selectedSizeAddon = $derived(selectedSizeOption?.addon ?? null);
	let selectedColorAddon = $derived(colors.find((addon) => addon.name === selectedColor) ?? null);
	let selectedFlavorAddon = $derived(flavors.find((addon) => addon.name === selectedFlavor) ?? null);
	let selectedCrownAddon = $derived(crowns.find((addon) => addon.name === selectedCrown) ?? null);
	let selectedGlitterAddon = $derived(glitters.find((addon) => addon.name === selectedGlitter) ?? null);
	let selectedSizePrice = $derived(selectedSizeOption ? selectedSizeOption.price : selectedSize ? getSizePrice(product, selectedSize) : startFromPrice);
	let darkColorSurcharge = $derived(selectedColorAddon?.is_dark_color ? parsePrice(selectedColorAddon.dark_color_surcharge) : 0);
	let cakeTopperFee = $derived(hasCakeTopper && cakeTopperAddon ? parsePrice(cakeTopperAddon.price) : 0);
	let addonUnitPrice = $derived(parsePrice(selectedFlavorAddon?.price) + parsePrice(selectedColorAddon?.price) + parsePrice(selectedCrownAddon?.price) + parsePrice(selectedGlitterAddon?.price));
	let estimatedUnitPrice = $derived(selectedSizePrice + addonUnitPrice + darkColorSurcharge + cakeTopperFee);
	let estimatedSubtotal = $derived(estimatedUnitPrice * Math.max(Number(quantity) || 1, 1));

	let primaryImage = $derived(
		product?.product_images?.find(img => img.is_primary)?.image_url || 
		product?.product_images?.[0]?.image_url || 
		null
	);

	function formatCurrency(amount) {
		return new Intl.NumberFormat(i18n.locale === 'en' ? 'en-US' : 'id-ID', { style: 'currency', currency: 'IDR' }).format(amount || 0);
	}

	function closeModal() {
		isOpen = false;
		errorMsg = '';
		fileName = '';
		selectedSize = undefined;
		selectedColor = undefined;
		selectedFlavor = undefined;
		selectedCrown = undefined;
		selectedGlitter = undefined;
		quantity = 1;
		hasCakeTopper = false;
	}

	function handleBackdropKey(event) {
		if (event.key === 'Escape' || (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' '))) {
			closeModal();
		}
	}

	async function handleAddToCart(event) {
		event.preventDefault();
		loading = true;
		errorMsg = '';

		const form = event.target;
		const formData = new FormData(form);

		try {
			let reference_image_url = null;
			const file = formData.get('reference_image');

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

			const customizedOptions = {
				size: selectedSize ? { name: selectedSize, price: selectedSizePrice, variant_id: selectedSizeOption?.id ?? null } : null,
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
				product_variant_id: selectedSizeOption?.id ?? null,
				product_name: product.name,
				primary_image: primaryImage,
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
				reference_image_url,
				cartItemId: crypto.randomUUID()
			};

			cart.addItem(cartItem);
			
			cart.isOpen = true;
			closeModal();
		} catch (err) {
			console.error(err);
			errorMsg = err.message || i18n.t('product.addToCartError');
		} finally {
			loading = false;
		}
	}
</script>

{#if isOpen && product}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end md:justify-center md:p-6"
		transition:fade={{ duration: 180 }}
		onclick={(e) => { if(e.target === e.currentTarget) closeModal() }}
		onkeydown={handleBackdropKey}
		role="button"
		tabindex="0"
		aria-label={i18n.t('quickAdd.close')}
	>
		<!-- Modal Box -->
		<div 
			class="bg-white md:rounded-[2rem] rounded-t-[2rem] shadow-2xl w-full max-w-2xl mx-auto overflow-hidden flex flex-col max-h-[90vh]"
			transition:scale={{ start: 0.97, duration: 190, opacity: 0, easing: cubicOut }}
		>
			<!-- Header -->
			<div class="px-6 py-4 md:py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
				<h3 class="text-xl font-bold text-[#4A3B32]">{i18n.t('quickAdd.title')}</h3>
				<button onclick={closeModal} aria-label={i18n.t('quickAdd.close')} class="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.92]">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>

			<!-- Form Body -->
			<div class="overflow-y-auto flex-1 p-6 space-y-6">
				<!-- Product Summary -->
				<div class="flex items-start gap-4">
					{#if primaryImage}
						<img src={getImageUrl(primaryImage, { width: 160, height: 160, quality: 75, resize: 'cover' })} alt={product.name} class="w-20 h-20 rounded-xl object-cover border border-slate-100" loading="lazy" decoding="async" />
					{/if}
					<div>
						<h4 class="font-bold text-[#4A3B32] text-lg leading-tight">{product.name}</h4>
						<p class="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#4A3B32]/45">{i18n.t('home.startFrom')}</p>
						<p class="text-primary font-semibold">{formatCurrency(startFromPrice)}</p>
					</div>
				</div>

				<hr class="border-slate-100" />

				<form id="quick-add-form" onsubmit={handleAddToCart} class="space-y-5">
					{#if errorMsg}
						<div class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
							{errorMsg}
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="cake_size" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.size')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
							<Select.Root type="single" name="cake_size" required bind:value={selectedSize}>
								<Select.Trigger id="cake_size" class="h-10 w-full rounded-xl border-primary/20 bg-slate-50 px-3 text-sm text-[#4A3B32] hover:bg-white focus-visible:ring-primary/15">
									<SelectValue placeholder={i18n.t('form.choose')} />
								</Select.Trigger>
								<Select.Content class="rounded-xl border-primary/10 bg-white text-[#4A3B32] shadow-xl shadow-primary/10">
								{#each sizePriceOptions as sizeOption}
									<Select.Item value={sizeOption.label} label={`${sizeOption.label} - ${formatCurrency(sizeOption.price)}`}>
										{sizeOption.label} - {formatCurrency(sizeOption.price)}
									</Select.Item>
								{/each}
								</Select.Content>
							</Select.Root>
						</div>
						<div>
							<label for="quantity" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.quantity')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
							<input type="number" id="quantity" name="quantity" min="1" bind:value={quantity} required class="w-full px-3 py-2.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-primary text-center transition-[background-color,border-color] duration-150" />
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#if flavors.length > 0}
							<div>
								<label for="cake_flavor" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.flavor')}</label>
								<Select.Root type="single" name="cake_flavor" bind:value={selectedFlavor} allowDeselect>
									<Select.Trigger id="cake_flavor" class="h-10 w-full rounded-xl border-primary/20 bg-slate-50 px-3 text-sm text-[#4A3B32] hover:bg-white focus-visible:ring-primary/15">
										<SelectValue placeholder={i18n.t('form.chooseFlavor')} />
									</Select.Trigger>
									<Select.Content class="rounded-xl border-primary/10 bg-white text-[#4A3B32] shadow-xl shadow-primary/10">
										{#each flavors as flavor}
											<Select.Item value={flavor.name} label={flavor.name}>{flavor.name}{flavor.price > 0 ? ` (+${formatCurrency(flavor.price)})` : ''}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}
						{#if colors.length > 0}
							<div>
								<label for="cake_color" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.color')}</label>
								<Select.Root type="single" name="cake_color" bind:value={selectedColor} allowDeselect>
									<Select.Trigger id="cake_color" class="h-10 w-full rounded-xl border-primary/20 bg-slate-50 px-3 text-sm text-[#4A3B32] hover:bg-white focus-visible:ring-primary/15">
										<SelectValue placeholder={i18n.t('form.chooseColor')} />
									</Select.Trigger>
									<Select.Content class="rounded-xl border-primary/10 bg-white text-[#4A3B32] shadow-xl shadow-primary/10">
										{#each colors as color}
											{@const colorPrice = color.price + (color.is_dark_color ? parsePrice(color.dark_color_surcharge) : 0)}
											<Select.Item value={color.name} label={color.name}>{color.name}{colorPrice > 0 ? ` (+${formatCurrency(colorPrice)})` : ''}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}
						{#if crowns.length > 0}
							<div>
								<label for="crown_option" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.crown')}</label>
								<Select.Root type="single" name="crown_option" bind:value={selectedCrown} allowDeselect>
									<Select.Trigger id="crown_option" class="h-10 w-full rounded-xl border-primary/20 bg-slate-50 px-3 text-sm text-[#4A3B32] hover:bg-white focus-visible:ring-primary/15">
										<SelectValue placeholder={i18n.t('form.chooseCrown')} />
									</Select.Trigger>
									<Select.Content class="rounded-xl border-primary/10 bg-white text-[#4A3B32] shadow-xl shadow-primary/10">
										{#each crowns as crown}
											<Select.Item value={crown.name} label={crown.name}>{crown.name}{crown.price > 0 ? ` (+${formatCurrency(crown.price)})` : ''}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/if}
						{#if glitters.length > 0}
							<div>
								<label for="add_edible_glitter" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.glitter')}</label>
								<Select.Root type="single" name="add_edible_glitter" bind:value={selectedGlitter} allowDeselect>
									<Select.Trigger id="add_edible_glitter" class="h-10 w-full rounded-xl border-primary/20 bg-slate-50 px-3 text-sm text-[#4A3B32] hover:bg-white focus-visible:ring-primary/15">
										<SelectValue placeholder={i18n.t('form.chooseGlitter')} />
									</Select.Trigger>
									<Select.Content class="rounded-xl border-primary/10 bg-white text-[#4A3B32] shadow-xl shadow-primary/10">
										{#each glitters as glitter}
											<Select.Item value={glitter.name} label={glitter.name}>{glitter.name}{glitter.price > 0 ? ` (+${formatCurrency(glitter.price)})` : ''}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{:else}
							<div>
								<label for="add_edible_glitter" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.extraGlitter')}</label>
								<input type="text" id="add_edible_glitter" name="add_edible_glitter" placeholder={i18n.t('form.optional')} class="w-full px-3 py-2.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-primary transition-[background-color,border-color] duration-150" />
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
						<label for="gift_card_text" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.giftCard')}</label>
						<input type="text" id="gift_card_text" name="gift_card_text" placeholder={i18n.t('form.emptyGiftCard')} class="w-full px-3 py-2.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-primary" />
					</div>
					<div>
						<label for="add_on" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.extraRequestCakeText')}</label>
						<input type="text" id="add_on" name="add_on" placeholder={i18n.t('form.extraRequestPlaceholder')} class="w-full px-3 py-2.5 bg-slate-50 border border-primary/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-primary" />
					</div>

					<div>
						<div class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">{i18n.t('form.designReference')}</div>
						<label class="flex flex-col items-center justify-center w-full h-24 border border-primary/20 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-primary/5 transition-all group overflow-hidden relative">
							<div class="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 z-10">
								<svg class="w-6 h-6 mb-2 text-primary/50 group-hover:text-primary group-hover:scale-110 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
								<p class="text-[13px] text-[#4A3B32]/70 font-medium truncate w-full px-4">{fileName || i18n.t('form.noFileSelected')}</p>
							</div>
							<input type="file" name="reference_image" accept="image/*" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20" onchange={(e) => fileName = e.target.files[0] ? e.target.files[0].name : ''} />
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
				</form>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0 shrink-0">
				<button type="button" onclick={closeModal} class="px-4 py-3 text-sm font-semibold text-[#4A3B32]/70 transition-[color,transform] duration-150 ease-out hover:text-[#4A3B32] active:scale-[0.97]">{i18n.t('quickAdd.cancel')}</button>
				<button form="quick-add-form" type="submit" disabled={loading} class="px-6 py-3 bg-primary hover:bg-[#724828] text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-primary/20 flex min-w-36 items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-[background-color,transform,box-shadow,opacity] duration-150 ease-out active:scale-[0.97]">
					{#if loading}
						<Loading label="" size="sm" class="text-white" />
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
					{/if}
					{i18n.t('quickAdd.save')}
				</button>
			</div>
		</div>
	</div>
{/if}
