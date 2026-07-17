<script>
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { getI18n } from '$lib/i18n.svelte.js';
	import { getSizePriceOptions, parsePrice } from '$lib/pricing.js';
	import Loading from '$lib/components/Loading.svelte';


	let { data } = $props();
	const i18n = getI18n();
	let product = $derived(data.product);

	function parseOptions(str) {
		if (!str) return [];
		return str.split(',').map(s => s.trim()).filter(Boolean);
	}

	let sizePriceOptions = $derived(getSizePriceOptions(product));
	let sizes = $derived(sizePriceOptions.length ? sizePriceOptions : parseOptions(product.sizes).map((name) => ({ label: name, price: parsePrice(product.base_price) })));
	let colors = $derived(parseOptions(product.colors));
	let flavors = $derived(parseOptions(product.flavors));
	let crowns = $derived(parseOptions(product.crown_options));
	let glitters = $derived(parseOptions(product.edible_glitter));

	let loading = $state(false);
	let errorMsg = $state('');
	let fileName = $state('');
	let selectedSize = $state('');
	let quantity = $state(1);
	let selectedSizeOption = $derived(sizePriceOptions.find((option) => option.label === selectedSize) ?? null);
	let selectedSizePrice = $derived(selectedSizeOption?.price ?? parsePrice(product.base_price));
	let estimatedSubtotal = $derived(selectedSizePrice * Math.max(Number(quantity) || 1, 1));
	const optionalOrderColumns = [
		'product_variant_id',
		'estimated_subtotal',
		'size_price',
		'estimated_unit_price',
		'customized_options'
	];

	const d = new Date();
	const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

	function isSchemaCacheColumnError(error) {
		return error?.code === 'PGRST204' || String(error?.message || '').includes('schema cache');
	}

	function withoutOptionalColumns(payload) {
		const copy = { ...payload };
		for (const column of optionalOrderColumns) delete copy[column];
		return copy;
	}

	async function handleSubmit(event) {
		event.preventDefault();
		loading = true;
		errorMsg = '';

		const form = event.target;
		const formData = new FormData(form);

		const selectedDate = formData.get('delivery_date');
		if (selectedDate && selectedDate < today) {
			loading = false;
			errorMsg = i18n.t('order.datePastError');
			return;
		}

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
				product_variant_id: selectedSizeOption?.id ?? null,
				customer_name: formData.get('customer_name'),
				phone_number: formData.get('phone_number'),
				address: formData.get('address'),
				email: String(formData.get('email') || '').trim().toLowerCase(),
				cake_size: formData.get('cake_size'),
				quantity: parseInt(formData.get('quantity')),
				cake_flavor: formData.get('cake_flavor') || 'Standard',
				cake_color: formData.get('cake_color') || null,
				crown_option: formData.get('crown_option') || null,
				add_edible_glitter: formData.get('add_edible_glitter') || null,
				delivery_date: formData.get('delivery_date') || null,
				delivery_time: formData.get('delivery_time') || null,
				cake_text: formData.get('add_on'),
				gift_card_text: formData.get('gift_card_text'),
				reference_image_url,
				status: 'Pending',
				amount: estimatedSubtotal,
				estimated_subtotal: estimatedSubtotal,
				size_price: selectedSizePrice,
				estimated_unit_price: selectedSizePrice,
				customized_options: {
					size: selectedSize ? { name: selectedSize, price: selectedSizePrice, variant_id: selectedSizeOption?.id ?? null } : null
				}
			};

			let { data: insertedOrder, error: insertError } = await supabase
				.from('orders')
				.insert(orderData)
				.select('id')
				.single();

			if (isSchemaCacheColumnError(insertError)) {
				({ data: insertedOrder, error: insertError } = await supabase
					.from('orders')
					.insert(withoutOptionalColumns(orderData))
					.select('id')
					.single());
			}

			if (insertError) throw insertError;

			if (!insertedOrder?.id) {
				throw new Error('Order berhasil dibuat, tetapi ID order tidak ditemukan.');
			}

			try {
				await fetch('/api/send-order-confirmation-email', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ orderId: insertedOrder.id })
				});
			} catch (emailError) {
				console.error('Order confirmation email failed:', emailError);
			}

			loading = false;
			goto(`/order/receipt/${insertedOrder.id}`);

		} catch (err) {
			console.error(err);
			errorMsg = err.message || i18n.t('order.processError');
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{i18n.t('order.title', { name: product.name })}</title>
</svelte:head>

<div class="max-w-xl mx-auto min-h-screen bg-[#f8fafc] sm:py-8">
	<div class="bg-white sm:rounded-3xl sm:shadow-[0_2px_20px_-8px_rgba(0,0,0,0.1)] overflow-hidden">
		<!-- Header -->
		<div class="px-6 py-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
			<h2 class="text-2xl font-bold text-slate-800 tracking-tight">{i18n.t('order.detailTitle')}</h2>
			<p class="text-slate-500 text-sm mt-1.5">{i18n.t('order.detailDescription')}</p>
		</div>

		<form onsubmit={handleSubmit} class="relative p-6 space-y-8">
			{#if loading}
				<Loading
					variant="overlay"
					label={i18n.t('order.sendOrder')}
					description="Mohon tunggu, pesanan sedang diproses."
					class="rounded-2xl"
				/>
			{/if}
			{#if errorMsg}
				<div class="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
					{errorMsg}
				</div>
			{/if}

			<!-- GROUP: Informasi Kontak -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">{i18n.t('order.customerInfo')}</h3>
				</div>
				
				<div class="space-y-4">
					<div>
						<label for="customer_name" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.fullName')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
						<input type="text" id="customer_name" name="customer_name" required placeholder={i18n.t('form.fullNamePlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
					<div>
						<label for="email" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.email')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
						<input type="email" id="email" name="email" required placeholder={i18n.t('form.emailPlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
					<div>
						<label for="phone_number" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.whatsapp')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
						<input type="tel" inputmode="numeric" pattern="[0-9]*" oninput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''); }} id="phone_number" name="phone_number" required placeholder={i18n.t('form.whatsappPlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
				</div>
			</div>

			<hr class="border-slate-100" />

			<!-- GROUP: Detail Pesanan -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">{i18n.t('order.cakeDetail')}</h3>
				</div>
				
				<div class="space-y-4">
					<div>
						<div class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('order.selectedCake')}</div>
						<div class="w-full px-4 py-3.5 bg-slate-100/50 rounded-xl text-[15px] text-slate-700 font-medium border-2 border-transparent">
							{product.name}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="cake_size" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.size')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
							<div class="relative">
								<select id="cake_size" name="cake_size" required bind:value={selectedSize} class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-slate-800 transition-all text-slate-700">
									<option value="" disabled selected>{i18n.t('form.choose')}</option>
									{#if sizes.length > 0}
										{#each sizes as size}
											<option value={size.label}>{size.label} - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(size.price)}</option>
										{/each}
									{:else}
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
									{/if}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
						<div>
							<label for="quantity" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.quantity')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
							<input type="number" id="quantity" name="quantity" min="1" bind:value={quantity} required class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] focus:outline-none focus:border-slate-800 transition-all text-center" />
						</div>
					</div>

					<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
						<div class="flex items-center justify-between">
							<span class="font-semibold text-slate-600">Estimasi harga</span>
							<span class="font-bold text-slate-900">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(estimatedSubtotal)}</span>
						</div>
					</div>

					<div>
						<div class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.designReference')}</div>
						<label class="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-all group overflow-hidden relative">
							{#if fileName}
								<div class="absolute inset-0 bg-slate-800/5 flex items-center justify-center p-4">
									<span class="px-4 py-2 bg-white rounded-lg shadow-sm text-sm font-medium text-slate-700 truncate max-w-[90%] border border-slate-200">{fileName}</span>
								</div>
							{:else}
								<div class="flex flex-col items-center justify-center pt-5 pb-6">
									<svg class="w-7 h-7 mb-2.5 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
									<p class="text-sm text-slate-500 font-medium">{i18n.t('form.tapToUpload')}</p>
								</div>
							{/if}
							<input type="file" id="reference_image" name="reference_image" accept="image/*" class="hidden" onchange={(e) => fileName = e.target.files[0]?.name || ''} />
						</label>
					</div>
				</div>
			</div>

			<hr class="border-slate-100" />

			<!-- GROUP: Kustomisasi -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">{i18n.t('order.customization')}</h3>
				</div>
				
				<div class="space-y-4">
					{#if flavors.length > 0}
						<div>
							<label for="cake_flavor" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.flavor')}</label>
							<div class="relative">
								<select id="cake_flavor" name="cake_flavor" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-slate-800 transition-all text-slate-700">
									<option value="" selected>{i18n.t('form.chooseFlavor')}</option>
									{#each flavors as flavor}
										<option value={flavor}>{flavor}</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
					{/if}

					{#if colors.length > 0}
						<div>
							<label for="cake_color" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.color')}</label>
							<div class="relative">
								<select id="cake_color" name="cake_color" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-slate-800 transition-all text-slate-700">
									<option value="" selected>{i18n.t('form.chooseColor')}</option>
									{#each colors as color}
										<option value={color}>{color}</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
					{/if}

					{#if crowns.length > 0}
						<div>
							<label for="crown_option" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.crown')}</label>
							<div class="relative">
								<select id="crown_option" name="crown_option" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-slate-800 transition-all text-slate-700">
									<option value="" selected>{i18n.t('form.chooseCrown')}</option>
									{#each crowns as crown}
										<option value={crown}>{crown}</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
					{/if}

					{#if glitters.length > 0}
						<div>
							<label for="add_edible_glitter" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.glitter')}</label>
							<div class="relative">
								<select id="add_edible_glitter" name="add_edible_glitter" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] appearance-none focus:outline-none focus:border-slate-800 transition-all text-slate-700">
									<option value="" selected>{i18n.t('form.chooseGlitter')}</option>
									{#each glitters as glitter}
										<option value={glitter}>{glitter}</option>
									{/each}
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
					{:else}
						<div>
							<label for="add_edible_glitter" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.extraGlitter')}</label>
							<input type="text" id="add_edible_glitter" name="add_edible_glitter" placeholder={i18n.t('form.extraGlitterPlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
						</div>
					{/if}

					<div>
						<label for="gift_card_text" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.giftCard')}</label>
						<input type="text" id="gift_card_text" name="gift_card_text" placeholder={i18n.t('form.emptyGiftCard')} class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
					<div>
						<label for="add_on" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.extraRequest')}</label>
						<input type="text" id="add_on" name="add_on" placeholder={i18n.t('form.extraRequestPlaceholder')} class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all" />
					</div>
				</div>
			</div>

			<hr class="border-slate-100" />

			<!-- GROUP: Pengiriman -->
			<div class="space-y-5">
				<div class="flex items-center gap-2.5">
					<div class="w-1.5 h-4 bg-slate-800 rounded-full"></div>
					<h3 class="text-sm font-bold uppercase tracking-wider text-slate-800">{i18n.t('order.shipping')}</h3>
				</div>
				
				<div class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="delivery_date" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.date')}</label>
							<input type="date" id="delivery_date" name="delivery_date" min={today} class="w-full px-4 py-[13.5px] bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] text-slate-700 focus:outline-none focus:border-slate-800 transition-all cursor-pointer" />
						</div>
						<div>
							<label for="delivery_time" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.time')}</label>
							<input type="time" id="delivery_time" name="delivery_time" class="w-full px-4 py-[13.5px] bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] text-slate-700 focus:outline-none focus:border-slate-800 transition-all cursor-pointer appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" />
						</div>
					</div>
					<div>
						<label for="address" class="block text-[13px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{i18n.t('form.address')} <span class="text-red-400">{i18n.t('form.required')}</span></label>
						<textarea id="address" name="address" required placeholder={i18n.t('form.addressPlaceholder')} rows="3" class="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:bg-white rounded-xl text-[15px] placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all resize-none"></textarea>
					</div>
				</div>
			</div>

			<!-- Submit Button -->
			<div class="pt-6 pb-6">
				<button type="submit" disabled={loading} class="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-[16px] tracking-wide rounded-xl transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100">
					{#if loading}
						<Loading label="" size="sm" class="text-white" />
					{/if}
					{i18n.t('order.sendOrder')}
				</button>
			</div>
		</form>
	</div>
</div>
