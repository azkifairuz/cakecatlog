<script>
	import { fade, scale } from 'svelte/transition';
	import { cart } from '$lib/stores/cart.svelte.js';
	import { supabase } from '$lib/supabase';
	import {
		CAKE_TOPPER_FEE,
		getSizePrice,
		getStartFromPrice,
		isDarkColor,
		normalizeSizePrices,
		parseCommaOptions,
		parsePrice
	} from '$lib/pricing.js';

	let { isOpen = $bindable(false), product = null } = $props();

	let loading = $state(false);
	let errorMsg = $state('');
	let fileName = $state('no file selected');
	let selectedSize = $state('');
	let selectedColor = $state('');
	let quantity = $state(1);
	let hasCakeTopper = $state(false);

	let sizePriceOptions = $derived(normalizeSizePrices(product));
	let colors = $derived(parseCommaOptions(product?.colors));
	let flavors = $derived(parseCommaOptions(product?.flavors));
	let crowns = $derived(parseCommaOptions(product?.crown_options));
	let glitters = $derived(parseCommaOptions(product?.edible_glitter));
	let startFromPrice = $derived(getStartFromPrice(product));
	let selectedSizePrice = $derived(selectedSize ? getSizePrice(product, selectedSize) : startFromPrice);
	let darkColorSurcharge = $derived(selectedColor && isDarkColor(selectedColor) ? parsePrice(product?.dark_color_surcharge) : 0);
	let cakeTopperFee = $derived(hasCakeTopper ? CAKE_TOPPER_FEE : 0);
	let estimatedUnitPrice = $derived(selectedSizePrice + darkColorSurcharge + cakeTopperFee);
	let estimatedSubtotal = $derived(estimatedUnitPrice * Math.max(Number(quantity) || 1, 1));

	let primaryImage = $derived(
		product?.product_images?.find(img => img.is_primary)?.image_url || 
		product?.product_images?.[0]?.image_url || 
		null
	);

	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount || 0);
	}

	function closeModal() {
		isOpen = false;
		errorMsg = '';
		fileName = 'no file selected';
		selectedSize = '';
		selectedColor = '';
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

			const cartItem = {
				product_id: product.id,
				product_name: product.name,
				primary_image: primaryImage,
				price_at_order: estimatedUnitPrice,
				base_price_at_order: parsePrice(product.base_price),
				size_price: selectedSizePrice,
				dark_color_surcharge: darkColorSurcharge,
				cake_topper_fee: cakeTopperFee,
				estimated_unit_price: estimatedUnitPrice,
				estimated_subtotal: estimatedSubtotal,
				has_cake_topper: hasCakeTopper,
				cake_size: formData.get('cake_size'),
				quantity: Math.max(parseInt(formData.get('quantity')) || 1, 1),
				cake_flavor: formData.get('cake_flavor') || 'Standard',
				cake_color: formData.get('cake_color') || null,
				crown_option: formData.get('crown_option') || null,
				add_edible_glitter: formData.get('add_edible_glitter') || null,
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
			errorMsg = err.message || 'Terjadi kesalahan saat menambahkan ke keranjang.';
		} finally {
			loading = false;
		}
	}
</script>

{#if isOpen && product}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end md:justify-center md:p-6"
		transition:fade={{ duration: 200 }}
		onclick={(e) => { if(e.target === e.currentTarget) closeModal() }}
		onkeydown={handleBackdropKey}
		role="button"
		tabindex="0"
		aria-label="Tutup modal tambah keranjang"
	>
		<!-- Modal Box -->
		<div 
			class="bg-white md:rounded-[2rem] rounded-t-[2rem] shadow-2xl w-full max-w-2xl mx-auto overflow-hidden flex flex-col max-h-[90vh]"
			transition:scale={{ start: 0.95, duration: 200, opacity: 0 }}
		>
			<!-- Header -->
			<div class="px-6 py-4 md:py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
				<h3 class="text-xl font-bold text-[#4A3B32]">Tambah ke Keranjang</h3>
				<button onclick={closeModal} aria-label="Tutup modal tambah keranjang" class="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>

			<!-- Form Body -->
			<div class="overflow-y-auto flex-1 p-6 space-y-6">
				<!-- Product Summary -->
				<div class="flex items-start gap-4">
					{#if primaryImage}
						<img src={primaryImage} alt={product.name} class="w-20 h-20 rounded-xl object-cover border border-slate-100" />
					{/if}
					<div>
						<h4 class="font-bold text-[#4A3B32] text-lg leading-tight">{product.name}</h4>
						<p class="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#4A3B32]/45">Start from</p>
						<p class="text-[#8C5A35] font-semibold">{formatCurrency(startFromPrice)}</p>
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
							<label for="cake_size" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Ukuran <span class="text-red-400">*</span></label>
							<select id="cake_size" name="cake_size" required bind:value={selectedSize} class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm appearance-none focus:outline-none focus:border-[#8C5A35]">
								<option value="" disabled>Pilih...</option>
								{#each sizePriceOptions as sizeOption}
									<option value={sizeOption.label}>{sizeOption.label} - {formatCurrency(sizeOption.price)}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="quantity" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Jumlah <span class="text-red-400">*</span></label>
							<input type="number" id="quantity" name="quantity" min="1" bind:value={quantity} required class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-[#8C5A35] text-center" />
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#if flavors.length > 0}
							<div>
								<label for="cake_flavor" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Pilihan Rasa</label>
								<select id="cake_flavor" name="cake_flavor" class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm appearance-none focus:outline-none focus:border-[#8C5A35]">
									<option value="" selected>Pilih Rasa...</option>
									{#each flavors as flavor}<option value={flavor}>{flavor}</option>{/each}
								</select>
							</div>
						{/if}
						{#if colors.length > 0}
							<div>
								<label for="cake_color" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Pilihan Warna</label>
								<select id="cake_color" name="cake_color" bind:value={selectedColor} class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm appearance-none focus:outline-none focus:border-[#8C5A35]">
									<option value="">Pilih Warna...</option>
									{#each colors as color}
										<option value={color}>{color}{isDarkColor(color) && parsePrice(product?.dark_color_surcharge) > 0 ? ` (+${formatCurrency(product.dark_color_surcharge)})` : ''}</option>
									{/each}
								</select>
							</div>
						{/if}
						{#if crowns.length > 0}
							<div>
								<label for="crown_option" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Pilihan Mahkota</label>
								<select id="crown_option" name="crown_option" class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm appearance-none focus:outline-none focus:border-[#8C5A35]">
									<option value="" selected>Pilih Mahkota...</option>
									{#each crowns as crown}<option value={crown}>{crown}</option>{/each}
								</select>
							</div>
						{/if}
						{#if glitters.length > 0}
							<div>
								<label for="add_edible_glitter" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Edible Glitter</label>
								<select id="add_edible_glitter" name="add_edible_glitter" class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm appearance-none focus:outline-none focus:border-[#8C5A35]">
									<option value="" selected>Pilih Glitter...</option>
									{#each glitters as glitter}<option value={glitter}>{glitter}</option>{/each}
								</select>
							</div>
						{:else}
							<div>
								<label for="add_edible_glitter" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Glitter Tambahan</label>
								<input type="text" id="add_edible_glitter" name="add_edible_glitter" placeholder="Opsional" class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-[#8C5A35]" />
							</div>
						{/if}
					</div>

					<div>
						<label class="flex items-start gap-3 rounded-xl border border-[#8C5A35]/15 bg-[#FFFBF7] p-4">
							<input type="checkbox" name="has_cake_topper" bind:checked={hasCakeTopper} class="mt-1 h-4 w-4 rounded border-[#8C5A35]/30 text-[#8C5A35]" />
							<span>
								<span class="block text-[12px] font-bold uppercase tracking-wide text-[#4A3B32]">Cake Topper</span>
								<span class="mt-0.5 block text-sm text-[#4A3B32]/65">Kena tambahan biaya {formatCurrency(CAKE_TOPPER_FEE)}</span>
							</span>
						</label>
					</div>

					<div>
						<label for="gift_card_text" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Tulisan Giftcard</label>
						<input type="text" id="gift_card_text" name="gift_card_text" placeholder="Kosongkan jika tidak ada" class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-[#8C5A35]" />
					</div>
					<div>
						<label for="add_on" class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Request Tambahan / Tulisan Kue</label>
						<input type="text" id="add_on" name="add_on" placeholder="Topper, lilin, bentuk khusus..." class="w-full px-3 py-2.5 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-sm focus:outline-none focus:border-[#8C5A35]" />
					</div>

					<div>
						<div class="block text-[12px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Referensi Desain (Opsional)</div>
						<label class="flex flex-col items-center justify-center w-full h-24 border border-[#8C5A35]/20 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-[#8C5A35]/5 transition-all group overflow-hidden relative">
							<div class="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4 z-10">
								<svg class="w-6 h-6 mb-2 text-[#8C5A35]/50 group-hover:text-[#8C5A35] group-hover:scale-110 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
								<p class="text-[13px] text-[#4A3B32]/70 font-medium truncate w-full px-4">{fileName}</p>
							</div>
							<input type="file" name="reference_image" accept="image/*" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-20" onchange={(e) => fileName = e.target.files[0] ? e.target.files[0].name : 'no file selected'} />
						</label>
					</div>

					<div class="rounded-2xl border border-[#8C5A35]/15 bg-[#FFFBF7] p-4">
						<div class="mb-3 flex items-center justify-between">
							<span class="text-[12px] font-bold uppercase tracking-wide text-[#4A3B32]/70">Estimasi Harga</span>
							<span class="text-lg font-black text-[#8C5A35]">{formatCurrency(estimatedSubtotal)}</span>
						</div>
						<div class="space-y-1.5 text-xs text-[#4A3B32]/65">
							<div class="flex justify-between gap-4">
								<span>Harga ukuran</span>
								<span class="font-semibold text-[#4A3B32]">{formatCurrency(selectedSizePrice)}</span>
							</div>
							{#if darkColorSurcharge > 0}
								<div class="flex justify-between gap-4">
									<span>Tambahan warna gelap</span>
									<span class="font-semibold text-[#4A3B32]">{formatCurrency(darkColorSurcharge)}</span>
								</div>
							{/if}
							{#if cakeTopperFee > 0}
								<div class="flex justify-between gap-4">
									<span>Cake topper</span>
									<span class="font-semibold text-[#4A3B32]">{formatCurrency(cakeTopperFee)}</span>
								</div>
							{/if}
							<div class="flex justify-between gap-4 border-t border-[#8C5A35]/10 pt-1.5">
								<span>Qty</span>
								<span class="font-semibold text-[#4A3B32]">{Math.max(Number(quantity) || 1, 1)}x</span>
							</div>
						</div>
						<p class="mt-3 text-[11px] leading-relaxed text-[#4A3B32]/55">Harga hanya estimasi. Harga final akan dikirim melalui invoice setelah pesanan direview.</p>
					</div>
				</form>
			</div>

			<!-- Footer -->
			<div class="px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0 shrink-0">
				<button type="button" onclick={closeModal} class="px-4 py-3 text-sm font-semibold text-[#4A3B32]/70 hover:text-[#4A3B32]">Batal</button>
				<button form="quick-add-form" type="submit" disabled={loading} class="px-6 py-3 bg-[#8C5A35] hover:bg-[#724828] text-white font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-[#8C5A35]/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all">
					{#if loading}
						<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
					{/if}
					Simpan ke Keranjang
				</button>
			</div>
		</div>
	</div>
{/if}
