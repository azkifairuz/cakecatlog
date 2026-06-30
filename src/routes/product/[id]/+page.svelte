<script>
	import * as Carousel from '$lib/components/ui/carousel';
	import { supabase } from '$lib/supabase';
	import { cart } from '$lib/stores/cart.svelte.js';
	
	let { data } = $props();
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
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}

	function parseOptions(str) {
		if (!str) return [];
		return str.split(',').map(s => s.trim()).filter(Boolean);
	}

	let sizes = $derived(parseOptions(product.sizes));
	let colors = $derived(parseOptions(product.colors));
	let flavors = $derived(parseOptions(product.flavors));
	let crowns = $derived(parseOptions(product.crown_options));
	let glitters = $derived(parseOptions(product.edible_glitter));

	let loading = $state(false);
	let errorMsg = $state('');
	let fileName = $state('no file selected');

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
			const cartItem = {
				product_id: product.id,
				product_name: product.name,
				primary_image: sortedImages[0]?.image_url || null,
				price_at_order: product.base_price,
				cake_size: formData.get('cake_size'),
				quantity: parseInt(formData.get('quantity')),
				cake_flavor: formData.get('cake_flavor') || 'Standard',
				cake_color: formData.get('cake_color') || null,
				crown_option: formData.get('crown_option') || null,
				add_edible_glitter: formData.get('add_edible_glitter') || null,
				cake_text: formData.get('add_on'),
				gift_card_text: formData.get('gift_card_text'),
				reference_image_url
			};

			cart.addItem(cartItem);
			
			// Reset form
			form.reset();
			fileName = 'no file selected';

		} catch (err) {
			console.error(err);
			errorMsg = err.message || 'Terjadi kesalahan saat menambahkan ke keranjang.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{product.name} | desertbyfir</title>
</svelte:head>

<div class="min-h-screen bg-[#FFFBF7] py-12 md:py-24 font-sans">
	<div class="container mx-auto px-6 max-w-6xl">
		<!-- Back Button -->
		<a href="/" class="inline-flex items-center gap-2 text-[#4A3B32]/70 hover:text-[#8C5A35] transition-colors font-medium mb-10 text-sm">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
			Kembali ke Katalog
		</a>

		<div class="bg-white rounded-[2.5rem] shadow-xl shadow-[#8C5A35]/5 overflow-hidden flex flex-col md:flex-row items-stretch border border-[#8C5A35]/10">
			<!-- Image Gallery -->
			<div class="w-full md:w-1/2 bg-[#FFFBF7] p-6 md:p-8 flex items-center justify-center border-r border-[#8C5A35]/10">
				{#if sortedImages.length > 0}
					{#if sortedImages.length > 1}
						<Carousel.Root class="w-full max-w-sm mx-auto">
							<Carousel.Content>
								{#each sortedImages as image (image.image_url)}
									<Carousel.Item>
										<div class="aspect-square overflow-hidden rounded-[2rem] bg-white border border-[#8C5A35]/10 shadow-sm relative">
											<img src={image.image_url} alt={product.name} class="w-full h-full object-cover" />
										</div>
									</Carousel.Item>
								{/each}
							</Carousel.Content>
							<div class="flex justify-center gap-2 mt-6">
								<Carousel.Previous class="static translate-y-0 h-10 w-10 border-[#8C5A35] text-[#8C5A35] hover:bg-[#8C5A35] hover:text-white transition-colors" />
								<Carousel.Next class="static translate-y-0 h-10 w-10 border-[#8C5A35] text-[#8C5A35] hover:bg-[#8C5A35] hover:text-white transition-colors" />
							</div>
						</Carousel.Root>
					{:else}
						<div class="aspect-square overflow-hidden rounded-[2rem] bg-white border border-[#8C5A35]/10 shadow-sm w-full max-w-sm mx-auto relative">
							<img src={sortedImages[0].image_url} alt={product.name} class="w-full h-full object-cover" />
						</div>
					{/if}
				{:else}
					<div class="aspect-square w-full max-w-sm mx-auto flex items-center justify-center rounded-[2rem] bg-white border border-dashed border-[#8C5A35]/20 text-[#4A3B32]/40 font-medium">
						Belum ada foto produk
					</div>
				{/if}
			</div>

			<!-- Product Info & Add to Cart Form -->
			<div class="w-full md:w-1/2 p-8 md:p-12">
				<div>
					{#if product.category}
						<span class="inline-block px-4 py-1.5 bg-[#8C5A35]/10 text-[#8C5A35] text-xs font-bold rounded-full mb-5 uppercase tracking-wider">
							{product.category.name}
						</span>
					{/if}
					
					<h1 class="text-4xl md:text-5xl font-bold text-[#4A3B32] mb-4 font-['Playfair_Display'] leading-tight">{product.name}</h1>
					<p class="text-3xl font-bold text-[#8C5A35] mb-8">{formatCurrency(product.base_price)}</p>
				</div>

				<div class="mb-10 pb-8 border-b border-[#8C5A35]/10">
					<h3 class="text-sm font-bold text-[#4A3B32] uppercase tracking-wider mb-3">Deskripsi Produk</h3>
					<p class="whitespace-pre-line text-[#4A3B32]/70 leading-relaxed text-[15px]">
						{product.description || 'Kue lezat ini belum memiliki deskripsi yang mendetail, namun kami jamin rasanya tidak akan mengecewakan.'}
					</p>
					
					{#if product.handling_warning}
						<div class="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
							<svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
							<div>
								<h4 class="text-[13px] font-bold text-amber-900 mb-0.5 uppercase tracking-wide">Info Penanganan Khusus</h4>
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
							<label for="cake_size" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Ukuran <span class="text-red-400">*</span></label>
							<div class="relative">
								<select id="cake_size" name="cake_size" required class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]">
									<option value="" disabled selected>Pilih...</option>
									{#if sizes.length > 0}
										{#each sizes as size}
											<option value={size}>{size}</option>
										{/each}
									{:else}
										<option value="8cm">8 cm</option>
										<option value="10cm">10 cm</option>
										<option value="12cm">12 cm</option>
										<option value="14cm">14 cm</option>
										<option value="16cm">16 cm</option>
										<option value="18cm">18 cm</option>
										<option value="20cm">20 cm</option>
										<option value="Custom">Custom</option>
									{/if}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#8C5A35]/50">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
						<div>
							<label for="quantity" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Jumlah <span class="text-red-400">*</span></label>
							<input type="number" id="quantity" name="quantity" min="1" value="1" required class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] focus:outline-none focus:border-[#8C5A35] transition-all text-center text-[#4A3B32]" />
						</div>
					</div>

					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#if flavors.length > 0}
							<div>
								<label for="cake_flavor" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Pilihan Rasa</label>
								<div class="relative">
									<select id="cake_flavor" name="cake_flavor" class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]">
										<option value="" selected>Pilih Rasa...</option>
										{#each flavors as flavor}
											<option value={flavor}>{flavor}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#8C5A35]/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{/if}

						{#if colors.length > 0}
							<div>
								<label for="cake_color" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Pilihan Warna</label>
								<div class="relative">
									<select id="cake_color" name="cake_color" class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]">
										<option value="" selected>Pilih Warna...</option>
										{#each colors as color}
											<option value={color}>{color}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#8C5A35]/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{/if}

						{#if crowns.length > 0}
							<div>
								<label for="crown_option" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Pilihan Mahkota</label>
								<div class="relative">
									<select id="crown_option" name="crown_option" class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]">
										<option value="" selected>Pilih Mahkota...</option>
										{#each crowns as crown}
											<option value={crown}>{crown}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#8C5A35]/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{/if}

						{#if glitters.length > 0}
							<div>
								<label for="add_edible_glitter" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Edible Glitter</label>
								<div class="relative">
									<select id="add_edible_glitter" name="add_edible_glitter" class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]">
										<option value="" selected>Pilih Glitter...</option>
										{#each glitters as glitter}
											<option value={glitter}>{glitter}</option>
										{/each}
									</select>
									<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#8C5A35]/50">
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
									</div>
								</div>
							</div>
						{:else}
							<div>
								<label for="add_edible_glitter" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Glitter Tambahan</label>
								<input type="text" id="add_edible_glitter" name="add_edible_glitter" placeholder="Contoh: Ya, warna gold" class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]" />
							</div>
						{/if}
					</div>

					<div>
						<label for="gift_card_text" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Tulisan Giftcard</label>
						<input type="text" id="gift_card_text" name="gift_card_text" placeholder="Kosongkan jika tidak ada" class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]" />
					</div>
					<div>
						<label for="add_on" class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Request Tambahan / Tulisan Kue</label>
						<input type="text" id="add_on" name="add_on" placeholder="Topper, lilin, bentuk khusus..." class="w-full px-4 py-3 bg-slate-50 border border-[#8C5A35]/20 focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-[#8C5A35] transition-all text-[#4A3B32]" />
					</div>

					<div>
						<div class="block text-[13px] font-semibold text-[#4A3B32] mb-1.5 uppercase tracking-wide">Referensi Desain (Opsional)</div>
						<label class="flex flex-col items-center justify-center w-full h-32 border border-[#8C5A35]/20 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-[#8C5A35]/5 transition-all group overflow-hidden relative">
							{#if fileName !== 'no file selected'}
								<div class="absolute inset-0 bg-[#8C5A35]/10 flex items-center justify-center p-4">
									<span class="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-[#4A3B32] truncate max-w-[90%] border border-[#8C5A35]/20">{fileName}</span>
								</div>
							{:else}
								<div class="flex flex-col items-center justify-center pt-5 pb-6">
									<svg class="w-7 h-7 mb-2.5 text-[#8C5A35]/40 group-hover:text-[#8C5A35]/70 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
									<p class="text-sm text-[#4A3B32]/60 font-medium">Tap untuk upload</p>
								</div>
							{/if}
							<input type="file" id="reference_image" name="reference_image" accept="image/*" class="hidden" onchange={(e) => fileName = e.target.files[0]?.name || 'no file selected'} />
						</label>
					</div>

					<button 
						type="submit"
						disabled={!product.is_available || loading}
						class="w-full py-4 mt-6 bg-[#8C5A35] text-white rounded-full font-bold text-[15px] hover:bg-[#724828] active:scale-[0.98] transition-all shadow-lg shadow-[#8C5A35]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{#if loading}
							<span class="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
						{/if}
						{product.is_available ? 'Masukkan ke Keranjang' : 'Stok Sedang Habis'}
					</button>
				</form>
				
			</div>
		</div>
	</div>
</div>
