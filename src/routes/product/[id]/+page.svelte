<script>
	import * as Carousel from '$lib/components/ui/carousel';
	
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
</script>

<svelte:head>
	<title>{product.name} | desertbyfir</title>
</svelte:head>

<div class="min-h-screen bg-[#FFFBF7] py-12 md:py-24 font-sans">
	<div class="container mx-auto px-6 max-w-5xl">
		<!-- Back Button -->
		<a href="/" class="inline-flex items-center gap-2 text-[#4A3B32]/70 hover:text-[#8C5A35] transition-colors font-medium mb-10 text-sm">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
			Kembali ke Katalog
		</a>

		<div class="bg-white rounded-[2.5rem] shadow-xl shadow-[#8C5A35]/5 overflow-hidden flex flex-col md:flex-row items-stretch border border-[#8C5A35]/10">
			<!-- Image Gallery -->
			<div class="w-full md:w-1/2 bg-[#FFFBF7] p-6 md:p-8 flex items-center justify-center">
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

			<!-- Product Info -->
			<div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
				<div>
					{#if product.category}
						<span class="inline-block px-4 py-1.5 bg-[#8C5A35]/10 text-[#8C5A35] text-xs font-bold rounded-full mb-5 uppercase tracking-wider">
							{product.category.name}
						</span>
					{/if}
					
					<h1 class="text-4xl md:text-5xl font-bold text-[#4A3B32] mb-4 font-['Playfair_Display'] leading-tight">{product.name}</h1>
					<p class="text-3xl font-bold text-[#8C5A35] mb-8">{formatCurrency(product.base_price)}</p>
				</div>

				<div class="mb-10">
					<h3 class="text-sm font-bold text-[#4A3B32] uppercase tracking-wider mb-3">Deskripsi Produk</h3>
					<p class="whitespace-pre-line text-[#4A3B32]/70 leading-relaxed text-[15px]">
						{product.description || 'Kue lezat ini belum memiliki deskripsi yang mendetail, namun kami jamin rasanya tidak akan mengecewakan.'}
					</p>
				</div>

				<div class="pt-8 border-t border-[#8C5A35]/10 mt-auto">
					<a href={`/order/${product.id}`} class="block w-full">
						<button 
							disabled={!product.is_available}
							class="w-full py-4 bg-[#8C5A35] text-white rounded-full font-bold text-[15px] hover:bg-[#724828] transition-all shadow-lg shadow-[#8C5A35]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#8C5A35]"
						>
							{product.is_available ? 'Pesan Sekarang' : 'Stok Sedang Habis'}
						</button>
					</a>
					<div class="flex items-center justify-center gap-2 text-xs font-medium text-[#4A3B32]/50 mt-5">
						<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						Pembayaran dilakukan dengan aman melalui transfer.
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
