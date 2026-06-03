<script>
	import { supabase } from '$lib/supabase';

	let { data } = $props();
	let product = $derived(data.product);

	let loading = $state(false);
	let errorMsg = $state('');
	let fileName = $state('no file selected');
	let showSuccessModal = $state(false);

	async function handleSubmit(event) {
		event.preventDefault();
		loading = true;
		errorMsg = '';

		const form = event.target;
		const formData = new FormData(form);

		try {
			let reference_image_url = null;
			const file = formData.get('reference_image');

			// 1. Upload reference image if exists
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

			// 2. Insert to orders table
			const orderData = {
				product_id: product.id,
				customer_name: formData.get('customer_name'),
				phone_number: formData.get('phone_number'),
				address: formData.get('address'),
				email: null,
				cake_size: formData.get('cake_size'),
				quantity: parseInt(formData.get('quantity')),
				cake_flavor: 'Standard', // Default since it's removed from UI
				cake_color: null,
				add_edible_glitter: formData.get('add_edible_glitter'),
				delivery_date: formData.get('delivery_date') || null,
				delivery_time: formData.get('delivery_time') || null,
				cake_text: formData.get('add_on'),
				gift_card_text: formData.get('gift_card_text'),
				reference_image_url,
				status: 'Pending'
			};

			const { error: insertError } = await supabase
				.from('orders')
				.insert(orderData);

			if (insertError) throw insertError;

			// 3. Generate WA Link & Redirect (Disabled for now)
			/*
			const waNumber = '6281234567890'; // Dummy number
			
			const text = `Halo Admin desertbyfir! Saya ingin konfirmasi pesanan saya:

*Order:* Pemesanan Baru
*Nama Pemesan:* ${orderData.customer_name}
*Produk:* ${product.name}
*Ukuran:* ${orderData.cake_size}
*Jumlah:* ${orderData.quantity}
*Tanggal Kirim:* ${orderData.delivery_date || '-'}
*Jam Kirim:* ${orderData.delivery_time || '-'}
*Alamat:* ${orderData.address}
*Glitter:* ${orderData.add_edible_glitter || '-'}
*Giftcard:* ${orderData.gift_card_text || '-'}
*Add-on/Request:* ${orderData.cake_text || '-'}

Mohon info total harga dan instruksi pembayaran. Terima kasih!`;

			const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
			window.location.href = waUrl;
			*/

			loading = false;
			showSuccessModal = true;

		} catch (err) {
			console.error(err);
			errorMsg = err.message || 'Terjadi kesalahan saat memproses pesanan Anda.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Order {product.name} | desertbyfir</title>
</svelte:head>

<div class="max-w-xl mx-auto min-h-screen bg-[#f8fafc] sm:py-8">
	<div class="bg-white sm:rounded-3xl sm:shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] overflow-hidden">
		<!-- Header -->
		<div class="px-6 py-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
			<h2 class="text-2xl font-bold text-slate-800 tracking-tight">Detail Pesanan</h2>
			<p class="text-slate-500 text-sm mt-1.5">Lengkapi data di bawah untuk memproses pesanan Anda.</p>
		</div>

		<form onsubmit={handleSubmit} class="p-6 space-y-8">
			{#if errorMsg}
				<div class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
					{errorMsg}
				</div>
			{/if}

			<!-- GROUP: Informasi Kontak -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">Informasi Pemesan</h3>
				</div>
				
				<div class="space-y-4">
					<div>
						<label for="customer_name" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nama Lengkap <span class="text-red-400">*</span></label>
						<input type="text" id="customer_name" name="customer_name" required placeholder="Masukkan nama Anda" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
					<div>
						<label for="phone_number" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">No. WhatsApp <span class="text-red-400">*</span></label>
						<input type="tel" id="phone_number" name="phone_number" required placeholder="Contoh: 08123456789" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
				</div>
			</div>

			<hr class="border-slate-100" />

			<!-- GROUP: Detail Pesanan -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">Detail Kue</h3>
				</div>
				
				<div class="space-y-4">
					<div>
						<label class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Kue Pilihan</label>
						<div class="w-full px-4 py-3.5 bg-slate-100/50 rounded-xl text-[15px] text-slate-700 font-medium border-2 border-transparent">
							{product.name}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="cake_size" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Ukuran <span class="text-red-400">*</span></label>
							<div class="relative">
								<select id="cake_size" name="cake_size" required class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-slate-800 transition-all text-slate-700">
									<option value="" disabled selected>Pilih...</option>
									<option value="8cm">8 cm</option>
									<option value="10cm">10 cm</option>
									<option value="12cm">12 cm</option>
									<option value="14cm">14 cm</option>
									<option value="16cm">16 cm</option>
									<option value="18cm">18 cm</option>
									<option value="20cm">20 cm</option>
									<option value="24cm">24 cm</option>
									<option value="26cm">26 cm</option>
									<option value="30cm">30 cm</option>
									<option value="40cm">40 cm</option>
									<option value="60cm">60 cm</option>
									<option value="80cm">80 cm</option>
									<option value="90cm">90 cm</option>
									<option value="100cm">100 cm</option>
									<option value="Custom">Custom</option>
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
						<div>
							<label for="quantity" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Jumlah <span class="text-red-400">*</span></label>
							<input type="number" id="quantity" name="quantity" min="1" value="1" required class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] focus:outline-none focus:border-slate-800 transition-all text-center" />
						</div>
					</div>

					<div>
						<label class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Referensi Desain (Opsional)</label>
						<label class="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group overflow-hidden relative">
							{#if fileName !== 'no file selected'}
								<div class="absolute inset-0 bg-slate-800/5 flex items-center justify-center p-4">
									<span class="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-slate-700 truncate max-w-[90%] border border-slate-200">{fileName}</span>
								</div>
							{:else}
								<div class="flex flex-col items-center justify-center pt-5 pb-6">
									<svg class="w-7 h-7 mb-2.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
									<p class="text-sm text-slate-500 font-medium">Tap untuk upload</p>
								</div>
							{/if}
							<input type="file" id="reference_image" name="reference_image" accept="image/*" class="hidden" onchange={(e) => fileName = e.target.files[0]?.name || 'no file selected'} />
						</label>
					</div>
				</div>
			</div>

			<hr class="border-slate-100" />

			<!-- GROUP: Kustomisasi -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">Kustomisasi</h3>
				</div>
				
				<div class="space-y-4">
					<div>
						<label for="gift_card_text" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tulisan Giftcard</label>
						<input type="text" id="gift_card_text" name="gift_card_text" placeholder="Kosongkan jika tidak ada" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
					<div>
						<label for="add_edible_glitter" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Glitter Tambahan</label>
						<input type="text" id="add_edible_glitter" name="add_edible_glitter" placeholder="Contoh: Ya, warna gold" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
					<div>
						<label for="add_on" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Request Tambahan</label>
						<input type="text" id="add_on" name="add_on" placeholder="Topper, lilin, bentuk khusus..." class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
				</div>
			</div>

			<hr class="border-slate-100" />

			<!-- GROUP: Pengiriman -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">Pengiriman</h3>
				</div>
				
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="delivery_date" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tanggal</label>
							<input type="date" id="delivery_date" name="delivery_date" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] text-slate-700 focus:outline-none focus:border-slate-800 transition-all" />
						</div>
						<div>
							<label for="delivery_time" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Waktu</label>
							<input type="text" id="delivery_time" name="delivery_time" placeholder="Misal: 14:00" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
						</div>
					</div>
					<div>
						<label for="address" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Alamat <span class="text-red-400">*</span></label>
						<textarea id="address" name="address" required placeholder="Tuliskan alamat lengkap pengiriman..." rows="3" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all resize-none"></textarea>
					</div>
				</div>
			</div>

			<!-- Submit Button -->
			<div class="pt-6 pb-6">
				<button type="submit" disabled={loading} class="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-[16px] tracking-wide rounded-xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100">
					{#if loading}
						<span class="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span>
					{/if}
					Kirim Pesanan
				</button>
			</div>
		</form>
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
			<h3 class="text-2xl font-bold text-slate-800 mb-2">Pesanan Berhasil!</h3>
			<p class="text-slate-500 text-[15px] mb-8 leading-relaxed">Terima kasih! Data pesanan Anda telah kami terima dengan baik dan akan segera diproses.</p>
			<a href="/" class="block w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-md">
				Kembali ke Katalog
			</a>
		</div>
	</div>
{/if}
