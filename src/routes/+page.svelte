<script>
	let { data } = $props();

	let selectedCategory = $state('All');
	
	let filteredProducts = $derived(
		selectedCategory === 'All' 
			? data.products 
			: data.products.filter(p => p.category?.slug === selectedCategory)
	);

	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}
</script>

<!-- HERO SECTION -->
<section class="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden bg-white">
	<!-- Decorative Background Element -->
	<div class="absolute right-0 top-0 w-3/4 md:w-1/2 h-full bg-[#FFFBF7] rounded-bl-[100px] md:rounded-bl-[200px] -z-10"></div>
	
	<div class="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-12">
		<div class="md:w-1/2 md:pr-8 text-center md:text-left z-10">
			<p class="text-[#8C5A35] text-xs font-bold uppercase tracking-[0.2em] mb-4">Artisan Bakery & Cake Shop</p>
			<h1 class="text-6xl md:text-7xl lg:text-8xl font-serif italic text-[#4A3B32] mb-6 font-['Playfair_Display'] leading-[1.1]">
				desertbyfir
			</h1>
			<p class="text-[#4A3B32]/70 leading-relaxed max-w-md mx-auto md:mx-0 mb-10 text-[15px]">
				Kami mempersembahkan kue dan pastry premium yang dibuat dengan cinta dan bahan-bahan berkualitas tinggi untuk momen spesial Anda.
			</p>
			<div class="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
				<a href="#catalog" class="w-full sm:w-auto px-8 py-3.5 bg-[#8C5A35] text-white rounded-full text-sm font-semibold hover:bg-[#724828] transition-all shadow-lg shadow-[#8C5A35]/20">Lihat Katalog</a>
				<a href="#about" class="w-full sm:w-auto px-8 py-3.5 border border-[#8C5A35] text-[#8C5A35] rounded-full text-sm font-semibold hover:bg-[#8C5A35]/5 transition-all">Pelajari Lebih Lanjut</a>
			</div>
		</div>
		<div class="md:w-1/2 relative flex justify-center w-full z-10">
			<!-- Decorative concentric lines behind image -->
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] border-[1px] border-[#8C5A35]/20 rounded-full"></div>
			<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] sm:w-[550px] sm:h-[550px] border-[1px] border-[#8C5A35]/10 rounded-full"></div>
			
			<!-- Dummy Hero Image -->
			<img src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Chocolate Cake" class="relative z-10 w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 object-cover rounded-full shadow-[0_20px_50px_-12px_rgba(140,90,53,0.3)] ring-8 ring-white" />
		</div>
	</div>
</section>

<!-- ABOUT SECTION -->
<section id="about" class="py-24 bg-white relative overflow-hidden">
	<div class="container mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center gap-16">
		<div class="md:w-1/2 relative">
			<img src="https://images.unsplash.com/photo-1621303837174-89787a7d4729?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="About Us Cake" class="rounded-[2rem] w-full max-w-md mx-auto shadow-2xl relative z-10" />
			<div class="absolute -bottom-8 -left-8 w-64 h-64 bg-[#FFFBF7] rounded-full -z-10"></div>
		</div>
		<div class="md:w-1/2">
			<h2 class="text-3xl lg:text-4xl font-bold text-[#4A3B32] mb-6 font-['Playfair_Display']">Tentang Kami</h2>
			<div class="space-y-4 text-[#4A3B32]/70 text-[15px] leading-relaxed">
				<p>
					desertbyfir adalah toko kue artisan yang berdedikasi untuk menciptakan karya seni yang dapat dinikmati. Kami percaya bahwa setiap perayaan layak mendapatkan kue yang tidak hanya cantik dipandang, tetapi juga luar biasa saat dirasakan.
				</p>
				<p>
					Setiap kue dibuat secara *handmade* oleh para *pastry chef* berpengalaman kami, menggunakan resep rahasia yang telah disempurnakan bertahun-tahun. Kepuasan Anda adalah prioritas utama kami.
				</p>
			</div>
			<div class="mt-8">
				<a href="#catalog" class="inline-block px-8 py-3 border border-[#8C5A35] text-[#8C5A35] rounded-full text-sm font-semibold hover:bg-[#8C5A35]/5 transition-all">Lihat Koleksi Kami</a>
			</div>
		</div>
	</div>
</section>

<!-- FEATURES SECTION -->
<section id="features" class="py-24 bg-[#FFFBF7]">
	<div class="container mx-auto px-6 text-center mb-16">
		<h2 class="text-3xl font-bold text-[#4A3B32] mb-4 font-['Playfair_Display']">Mengapa Memilih Kami?</h2>
		<p class="text-[#4A3B32]/60 text-sm max-w-xl mx-auto">Kami berkomitmen memberikan pelayanan dan kualitas terbaik untuk setiap pesanan Anda.</p>
	</div>
	<div class="container mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-center max-w-5xl">
		<!-- Feature 1 -->
		<div class="flex flex-col items-center">
			<div class="w-16 h-16 rounded-full bg-white shadow-sm border border-[#8C5A35]/10 flex items-center justify-center mb-5 text-[#8C5A35]">
				<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
			</div>
			<h4 class="font-bold text-[#4A3B32] mb-2 text-[15px]">Garansi Kualitas</h4>
			<p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Kami menggunakan bahan baku premium pilihan untuk hasil yang maksimal.</p>
		</div>
		<!-- Feature 2 -->
		<div class="flex flex-col items-center">
			<div class="w-16 h-16 rounded-full bg-white shadow-sm border border-[#8C5A35]/10 flex items-center justify-center mb-5 text-[#8C5A35]">
				<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
			</div>
			<h4 class="font-bold text-[#4A3B32] mb-2 text-[15px]">Pengiriman Tepat Waktu</h4>
			<p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Pesanan Anda akan tiba tepat pada waktu yang telah disepakati.</p>
		</div>
		<!-- Feature 3 -->
		<div class="flex flex-col items-center">
			<div class="w-16 h-16 rounded-full bg-white shadow-sm border border-[#8C5A35]/10 flex items-center justify-center mb-5 text-[#8C5A35]">
				<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
			</div>
			<h4 class="font-bold text-[#4A3B32] mb-2 text-[15px]">Resep Rahasia</h4>
			<p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Dibuat dari resep original yang disempurnakan oleh ahlinya.</p>
		</div>
		<!-- Feature 4 -->
		<div class="flex flex-col items-center">
			<div class="w-16 h-16 rounded-full bg-white shadow-sm border border-[#8C5A35]/10 flex items-center justify-center mb-5 text-[#8C5A35]">
				<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
			</div>
			<h4 class="font-bold text-[#4A3B32] mb-2 text-[15px]">Pelayanan Ramah</h4>
			<p class="text-[13px] text-[#4A3B32]/60 leading-relaxed">Customer service kami siap membantu mewujudkan kue impian Anda.</p>
		</div>
	</div>
</section>

<!-- CATALOG SECTION -->
<section id="catalog" class="py-24 bg-white">
	<div class="container mx-auto px-6 text-center mb-16">
		<h2 class="text-3xl font-bold text-[#4A3B32] mb-8 font-['Playfair_Display']">Katalog</h2>
		
		<!-- Category Pills -->
		<div class="flex flex-wrap justify-center gap-3">
			<button 
				class="px-6 py-2 rounded-full border text-[13px] font-semibold tracking-wide transition-all {selectedCategory === 'All' ? 'border-[#8C5A35] bg-[#8C5A35] text-white' : 'border-slate-200 text-[#4A3B32] hover:border-[#8C5A35]'}"
				onclick={() => selectedCategory = 'All'}
			>
				Semua
			</button>
			{#each data.categories as category}
				<button 
					class="px-6 py-2 rounded-full border text-[13px] font-semibold tracking-wide transition-all {selectedCategory === category.slug ? 'border-[#8C5A35] bg-[#8C5A35] text-white' : 'border-slate-200 text-[#4A3B32] hover:border-[#8C5A35]'}"
					onclick={() => selectedCategory = category.slug}
				>
					{category.name}
				</button>
			{/each}
		</div>
	</div>

	<div class="container mx-auto px-6 max-w-7xl">
		<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
			{#each filteredProducts as product}
				{@const primaryImg = product.product_images?.find(img => img.is_primary) || product.product_images?.[0]}
				<div class="bg-white rounded-[2rem] p-4 border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(140,90,53,0.15)] hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative">
					<!-- Card Link Cover (Makes the whole top part clickable) -->
					<a href={`/product/${product.id}`} class="absolute inset-0 z-0" aria-label={`Lihat detail ${product.name}`}></a>
					
					<div class="aspect-square w-full rounded-[1.5rem] overflow-hidden bg-[#FFFBF7] mb-5 relative flex items-center justify-center p-2 z-10 pointer-events-none">
						{#if primaryImg}
							<img src={primaryImg.image_url} alt={product.name} class="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover:scale-105" />
						{:else}
							<div class="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 rounded-xl">No Image</div>
						{/if}
						{#if product.category}
							<div class="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-[#8C5A35] text-[11px] font-bold rounded-full shadow-sm z-10">
								{product.category.name}
							</div>
						{/if}
					</div>
					<div class="px-2 flex flex-col flex-1 z-10 pointer-events-none">
						<h3 class="font-bold text-[#4A3B32] mb-1.5 text-[15px] group-hover:text-[#8C5A35] transition-colors">{product.name}</h3>
						<p class="text-[13px] text-[#4A3B32]/50 line-clamp-2 mb-6 flex-1 leading-relaxed">{product.description}</p>
						
						<div class="flex items-center justify-between mt-auto pointer-events-auto">
							<div class="flex flex-col">
								<span class="text-[10px] uppercase font-bold tracking-wider text-[#4A3B32]/50 mb-0.5">Start from</span>
								<span class="font-bold text-[#4A3B32] text-lg leading-none">{formatCurrency(product.base_price)}</span>
							</div>
							<a href={`/order/${product.id}`} class="px-5 py-2.5 bg-[#8C5A35] text-white text-[13px] font-semibold rounded-full hover:bg-[#724828] transition-colors shadow-md shadow-[#8C5A35]/20 relative z-20">Pesan</a>
						</div>
					</div>
				</div>
			{:else}
				<div class="col-span-full text-center py-16 text-[#4A3B32]/50">
					{#if selectedCategory === 'All'}
						Belum ada produk di katalog.
					{:else}
						Belum ada produk di kategori ini.
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
