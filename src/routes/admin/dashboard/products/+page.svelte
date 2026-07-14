<script>
	import { enhance } from '$app/forms';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { getImageUrl } from '$lib/image-url.js';
	import { fly, fade } from 'svelte/transition';
	import { getProductAddons, getStartFromPrice } from '$lib/pricing.js';

	let { data, form } = $props();
	let isFormOpen = $state(false);
	let isSubmitting = $state(false);
	let editingProduct = $state(null);
	let categories = $state([]);
	let selectedCategoryId = $state('');
	let categoryQuery = $state('');
	let isCategoryDropdownOpen = $state(false);
	let pendingCategoryName = $state('');
	let isCreateCategoryModalOpen = $state(false);
	let isCreatingCategory = $state(false);
	let categoryCreateError = $state('');
	let categoryCreateSuccess = $state('');

	$effect(() => {
		categories = data.categories ?? [];
	});

	let newImages = $state([]);
	let existingImages = $state([]);
	let deletedImageIds = $state([]);
	let productAddonStates = $state({});
	let newAddonRows = $state([]);

	// Detail drawer
	let selectedProductDetail = $state(null);
	let isDrawerOpen = $state(false);

	let customizeAddons = $state(false);

	function openCreateForm() {
		editingProduct = null;
		newImages = [];
		existingImages = [];
		deletedImageIds = [];
		productAddonStates = {};
		customizeAddons = false;
		newAddonRows = [];
		selectedCategoryId = '';
		categoryQuery = '';
		isCategoryDropdownOpen = false;
		categoryCreateError = '';
		categoryCreateSuccess = '';
		isFormOpen = true;
	}

	function openEditForm(product) {
		editingProduct = product;
		newImages = [];
		existingImages = product.product_images ? [...product.product_images] : [];
		deletedImageIds = [];
		productAddonStates = Object.fromEntries(
			(product.product_addons ?? []).map((item) => [
				item.addon_id,
				item.is_active === false ? 'inactive' : 'active'
			])
		);
		customizeAddons = Object.keys(productAddonStates).length > 0;
		newAddonRows = [];
		selectedCategoryId = product.category_id ?? '';
		categoryQuery = getCategoryName(product.category_id);
		isCategoryDropdownOpen = false;
		categoryCreateError = '';
		categoryCreateSuccess = '';
		isFormOpen = true;
		
		// Scroll to top
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function handleFileChange(event) {
		const files = Array.from(event.target.files);
		const currentTotal = existingImages.length + newImages.length;
		const allowedToAdd = 5 - currentTotal;
		
		if (allowedToAdd <= 0) {
			alert('Maksimal 5 gambar diperbolehkan.');
			return;
		}

		const filesToAdd = files.slice(0, allowedToAdd);
		if (files.length > allowedToAdd) {
			alert(`Hanya ${allowedToAdd} gambar yang ditambahkan (batas maks 5).`);
		}

		filesToAdd.forEach(file => {
			const reader = new FileReader();
			reader.onload = (e) => {
				newImages = [...newImages, { file, previewUrl: e.target.result }];
			};
			reader.readAsDataURL(file);
		});
		
		event.target.value = '';
	}

	function removeNewImage(index) {
		newImages = newImages.filter((_, i) => i !== index);
	}

	function removeExistingImage(image) {
		existingImages = existingImages.filter(img => img.id !== image.id);
		deletedImageIds = [...deletedImageIds, image.id];
	}

	function openDetail(product) {
		selectedProductDetail = product;
		isDrawerOpen = true;
	}

	function closeDetail() {
		isDrawerOpen = false;
		selectedProductDetail = null;
	}

	let addonSearchQuery = $state('');
	let addonViewMode = $state('card'); // 'card' or 'table'

	let filteredGlobalAddons = $derived(
		data.globalAddons.filter(addon => 
			addon.name.toLowerCase().includes(addonSearchQuery.toLowerCase()) || 
			addon.category.toLowerCase().includes(addonSearchQuery.toLowerCase())
		)
	);

	let groupedGlobalAddons = $derived(
		filteredGlobalAddons.reduce((groups, addon) => {
			groups[addon.category] = [...(groups[addon.category] ?? []), addon];
			return groups;
		}, {})
	);
	let filteredCategories = $derived(
		categories.filter((category) =>
			category.name.toLowerCase().includes(categoryQuery.trim().toLowerCase())
		)
	);
	let canCreateCategory = $derived(
		categoryQuery.trim() &&
		!categories.some((category) => category.name.toLowerCase() === categoryQuery.trim().toLowerCase())
	);

	function getCategoryName(categoryId) {
		return categories.find((category) => category.id === categoryId)?.name ?? '';
	}

	function selectCategory(category) {
		selectedCategoryId = category?.id ?? '';
		categoryQuery = category?.name ?? '';
		isCategoryDropdownOpen = false;
	}

	function openCreateCategoryModal() {
		const name = categoryQuery.trim();
		if (!name) return;
		pendingCategoryName = name;
		categoryCreateError = '';
		isCreateCategoryModalOpen = true;
		isCategoryDropdownOpen = false;
	}

	function closeCreateCategoryModal() {
		if (isCreatingCategory) return;
		isCreateCategoryModalOpen = false;
		pendingCategoryName = '';
		categoryCreateError = '';
	}

	function setProductAddonState(addonId, state) {
		if (state === 'default') {
			const { [addonId]: _removed, ...rest } = productAddonStates;
			productAddonStates = rest;
			return;
		}

		productAddonStates = { ...productAddonStates, [addonId]: state };
	}

	function serializeProductAddonStates() {
		if (!customizeAddons) return [];
		return Object.entries(productAddonStates).map(([addon_id, state]) => ({
			addon_id,
			is_active: state === 'active'
		}));
	}

	function addNewAddonRow() {
		newAddonRows = [
			...newAddonRows,
			{
				category: 'size',
				name: '',
				additional_price: '',
				is_dark_color: false,
				dark_color_surcharge: '',
				is_active: true
			}
		];
	}

	function removeNewAddonRow(index) {
		newAddonRows = newAddonRows.filter((_, i) => i !== index);
	}

	function serializeNewAddons() {
		if (!customizeAddons) return [];
		return newAddonRows
			.map((row) => ({
				category: row.category,
				name: row.name?.trim() ?? '',
				additional_price: row.additional_price,
				is_dark_color: Boolean(row.is_dark_color),
				dark_color_surcharge: row.is_dark_color ? row.dark_color_surcharge : 0,
				is_active: Boolean(row.is_active)
			}))
			.filter((row) => row.category && row.name);
	}

	function groupAddons(addons) {
		return addons.reduce((groups, addon) => {
			groups[addon.category] = [...(groups[addon.category] ?? []), addon];
			return groups;
		}, {});
	}

	function formatCurrency(amount) {
		if (!amount) return '-';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}

	let pagination = $derived(data.pagination);
	let canGoPrev = $derived(pagination.page > 1);
	let canGoNext = $derived(pagination.page < pagination.totalPages);

	function getPageHref(page) {
		return `?page=${page}`;
	}
</script>

<div class="flex items-center justify-between mb-4">
	<h1 class="text-lg font-semibold md:text-2xl">Products</h1>
	<Button onclick={() => isFormOpen ? (isFormOpen = false) : openCreateForm()} class="cursor-pointer active:scale-95 transition-transform">
		{isFormOpen ? 'Cancel' : 'Add New Product'}
	</Button>
</div>

{#if form?.error}
	<div class="p-4 bg-destructive/15 text-destructive font-medium text-sm mb-4 rounded-md">
		Error: {form.error}
	</div>
{/if}

{#if isFormOpen}
	<Card.Root class="mb-8 border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
		<Card.Header class="bg-slate-50/50 border-b border-slate-100 pb-4">
			<Card.Title class="text-xl text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Product'}</Card.Title>
			<Card.Description>Fill in the details for this cake in your catalog.</Card.Description>
		</Card.Header>
		<Card.Content class="pt-6">
			<form method="POST" action={editingProduct ? '?/updateProduct' : '?/createProduct'} enctype="multipart/form-data" use:enhance={({ formData }) => {
				isSubmitting = true;
				// Prevent default file input from sending if any
				formData.delete('images_upload');
				formData.set('category_id', selectedCategoryId);
				formData.set('product_addons', JSON.stringify(serializeProductAddonStates()));
				formData.set('new_addons', JSON.stringify(serializeNewAddons()));
				
				// Append files from state
				newImages.forEach(img => {
					formData.append('images', img.file);
				});

				if (editingProduct) {
					formData.append('id', editingProduct.id);
					formData.append('deleted_image_ids', deletedImageIds.join(','));
				}

				return async ({ update, result }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success' && result.data?.success) {
						isFormOpen = false;
						editingProduct = null;
						newImages = [];
						existingImages = [];
						deletedImageIds = [];
						selectedCategoryId = '';
						categoryQuery = '';
					}
				};
			}} class="grid gap-5 md:grid-cols-2">
				
				<div class="grid gap-2">
					<Label for="name">Product Name *</Label>
					<Input id="name" name="name" required value={editingProduct?.name ?? ''} class="bg-slate-50 focus:bg-white" />
				</div>
				
				<div class="grid gap-2 md:col-span-2">
					<Label for="category_search">Category</Label>
					<input type="hidden" name="category_id" value={selectedCategoryId} />
					<div class="relative">
						<Input
							id="category_search"
							type="text"
							placeholder="Cari atau buat category baru"
							bind:value={categoryQuery}
							onfocus={() => (isCategoryDropdownOpen = true)}
							oninput={() => {
								selectedCategoryId = '';
								isCategoryDropdownOpen = true;
								categoryCreateSuccess = '';
							}}
							class="bg-slate-50 focus:bg-white"
							autocomplete="off"
						/>
						<button
							type="button"
							class="absolute inset-y-0 right-2 flex items-center px-2 text-slate-400 hover:text-slate-700"
							onclick={() => (isCategoryDropdownOpen = !isCategoryDropdownOpen)}
							aria-label="Toggle category dropdown"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
						</button>

						{#if isCategoryDropdownOpen}
							<div class="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
								<button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onclick={() => selectCategory(null)}>
									<span class="text-slate-500">No Category</span>
									{#if !selectedCategoryId}<span class="text-xs font-bold text-primary">Selected</span>{/if}
								</button>
								{#each filteredCategories as category}
									<button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onclick={() => selectCategory(category)}>
										<span class="font-medium text-slate-700">{category.name}</span>
										{#if selectedCategoryId === category.id}<span class="text-xs font-bold text-primary">Selected</span>{/if}
									</button>
								{/each}
								{#if canCreateCategory}
									<button type="button" class="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/10" onclick={openCreateCategoryModal}>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
										Create "{categoryQuery.trim()}"
									</button>
								{/if}
								{#if filteredCategories.length === 0 && !canCreateCategory}
									<div class="px-3 py-3 text-sm text-slate-500">Tidak ada category.</div>
								{/if}
							</div>
						{/if}
					</div>
					{#if categoryCreateSuccess}
						<p class="text-xs font-semibold text-emerald-600">{categoryCreateSuccess}</p>
					{/if}
				</div>
				
				<div class="space-y-2 relative">
					<Label for="base_price">Harga Dasar (Rp) <span class="text-red-500">*</span></Label>
					<PriceInput id="base_price" name="base_price" required={true} value={editingProduct?.base_price ?? ''} class="bg-slate-50 focus:bg-white" />
				</div>
				
				<div class="grid gap-2 md:col-span-2">
					<Label for="description">Description</Label>
					<Textarea id="description" name="description" rows="3" value={editingProduct?.description ?? ''} class="bg-slate-50 focus:bg-white resize-none" />
				</div>

				<div class="grid gap-2 md:col-span-2">
					<Label for="handling_warning">Handling Warning (Peringatan Penanganan Khusus)</Label>
					<Textarea id="handling_warning" name="handling_warning" placeholder="Contoh: Harap simpan di dalam kulkas setelah diterima." rows="2" value={editingProduct?.handling_warning ?? ''} class="bg-slate-50 focus:bg-white resize-none border-amber-200 focus-visible:ring-amber-500" />
				</div>

				<div class="grid gap-2 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="text-sm font-semibold text-slate-800">Modifikasi Addons</h3>
							<p class="text-xs text-muted-foreground">Aktifkan untuk mengubah pengaturan addon khusus untuk produk ini.</p>
						</div>
						<Switch bind:checked={customizeAddons} label="" description="" />
					</div>
					
					{#if customizeAddons}
						<div class="grid gap-4 mt-2" transition:fly={{ y: 20, duration: 250, opacity: 0 }}>
													<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
								<div class="flex items-center justify-between gap-3">
									<div>
										<h4 class="text-sm font-semibold text-slate-800">Tambah Addon Baru</h4>
										<p class="text-xs text-slate-500">Addon baru akan masuk ke global addons dan otomatis aktif untuk product ini.</p>
									</div>
									<Button type="button" variant="outline" size="sm" onclick={addNewAddonRow}>+ Addon</Button>
								</div>

								{#if newAddonRows.length > 0}
									<div class="mt-3 space-y-3">
										{#each newAddonRows as row, index}
											<div class="rounded-xl border border-slate-200 bg-white p-3">
												<div class="grid gap-2 md:grid-cols-4">
													<select bind:value={row.category} class="h-10 rounded-md border border-input bg-slate-50 px-3 py-2 text-sm">
														<option value="size">size</option>
														<option value="color">color</option>
														<option value="flavor">flavor</option>
														<option value="crown">crown</option>
														<option value="glitter">glitter</option>
														<option value="cake_topper">cake_topper</option>
													</select>
													<Input bind:value={row.name} placeholder="Nama addon" class="bg-slate-50 md:col-span-2" />
													<PriceInput bind:value={row.additional_price} placeholder="Harga" class="bg-slate-50" />
												</div>

												<div class="mt-3 grid gap-3 md:grid-cols-2">
													<Switch
														bind:checked={row.is_active}
														label="Aktif"
														description="Langsung tampilkan addon ini"
													/>
													<Switch
														bind:checked={row.is_dark_color}
														label="Warna Gelap"
														description="Aktifkan biaya warna gelap"
													/>
												</div>

												<div class="mt-3 flex items-end gap-3">
													{#if row.is_dark_color}
														<div class="grid flex-1 gap-1.5">
															<Label>Dark Color Surcharge</Label>
															<PriceInput bind:value={row.dark_color_surcharge} placeholder="Biaya gelap" class="bg-slate-50" />
														</div>
													{:else}
														<span class="flex-1 text-xs text-slate-500">Biaya warna gelap akan muncul saat toggle Warna Gelap aktif.</span>
													{/if}
													<Button type="button" variant="ghost" size="icon" class="shrink-0 text-red-500 hover:bg-red-50" onclick={() => removeNewAddonRow(index)} aria-label={`Hapus addon baru ${index + 1}`}>
														<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
													</Button>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
							<div>
								<div class="flex items-center justify-between mb-2">
									<div>
										<h3 class="text-sm font-semibold text-slate-800">Product Addons</h3>
										<p class="text-xs text-muted-foreground">Pilih Default untuk mengikuti konfigurasi global, Aktif untuk menampilkan, atau Nonaktif untuk menyembunyikan addon.</p>
									</div>
								</div>
								
								<div class="mb-4 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-2 rounded-lg border border-slate-200">
									<div class="relative w-full sm:max-w-xs">
										<svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
										<Input bind:value={addonSearchQuery} placeholder="Cari nama atau kategori..." class="pl-8 bg-slate-50 border-slate-200 h-8 text-xs" />
									</div>
									<div class="flex items-center gap-2 border-l border-slate-200 pl-3">
										<span class="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Tampilan:</span>
										<div class="flex bg-slate-100 p-0.5 rounded-md">
											<button type="button" class="p-1 rounded transition-colors {addonViewMode === 'card' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" onclick={() => addonViewMode = 'card'} aria-label="Card View">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
											</button>
											<button type="button" class="p-1 rounded transition-colors {addonViewMode === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" onclick={() => addonViewMode = 'table'} aria-label="Table View">
												<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
											</button>
										</div>
									</div>
								</div>
								
								{#if addonViewMode === 'card'}
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										{#each Object.entries(groupedGlobalAddons) as [category, addons]}
											<div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
												<p class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{category}</p>
												<div class="space-y-2">
													{#each addons as addon}
														<div class="rounded-lg bg-white p-2 text-sm border border-slate-100">
															<div class="flex items-start justify-between gap-3">
																<div>
																<span class="block font-semibold text-slate-700">{addon.name}</span>
																<span class="text-xs text-slate-500">{formatCurrency(addon.additional_price)}{addon.is_active ? '' : ' · nonaktif'}</span>
																</div>
																<span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {productAddonStates[addon.id] === 'active' ? 'bg-emerald-50 text-emerald-700' : productAddonStates[addon.id] === 'inactive' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}">
																	{productAddonStates[addon.id] ?? 'default'}
																</span>
															</div>
															<div class="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
																<button type="button" class="rounded-md px-2 py-1 text-xs font-semibold {productAddonStates[addon.id] === undefined ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}" onclick={() => setProductAddonState(addon.id, 'default')}>Default</button>
																<button type="button" class="rounded-md px-2 py-1 text-xs font-semibold {productAddonStates[addon.id] === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}" onclick={() => setProductAddonState(addon.id, 'active')}>Aktif</button>
																<button type="button" class="rounded-md px-2 py-1 text-xs font-semibold {productAddonStates[addon.id] === 'inactive' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500'}" onclick={() => setProductAddonState(addon.id, 'inactive')}>Nonaktif</button>
															</div>
														</div>
													{/each}
												</div>
											</div>
										{/each}
										{#if Object.keys(groupedGlobalAddons).length === 0}
											<div class="md:col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-center text-slate-500">
												Tidak ada addon yang cocok dengan pencarian.
											</div>
										{/if}
									</div>
								{:else}
									<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
										<div class="overflow-x-auto">
											<table class="w-full text-left text-sm text-slate-600">
												<thead class="bg-slate-50/50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
													<tr>
														<th class="px-3 py-2 font-semibold">Addon</th>
														<th class="px-3 py-2 font-semibold text-center w-24">Status</th>
														<th class="px-3 py-2 font-semibold">Tindakan</th>
													</tr>
												</thead>
												<tbody class="divide-y divide-slate-100">
													{#each filteredGlobalAddons as addon}
														<tr class="hover:bg-slate-50/50">
															<td class="px-3 py-2">
																<p class="font-semibold text-slate-800 text-xs">{addon.name}</p>
																<div class="flex items-center gap-1.5 mt-0.5">
																	<span class="capitalize text-[9px] font-bold text-slate-500 border border-slate-200 px-1 py-0.5 rounded bg-white">{addon.category}</span>
																	<span class="text-[10px] text-slate-500">{formatCurrency(addon.additional_price)}</span>
																</div>
															</td>
															<td class="px-3 py-2 text-center align-middle">
																<span class="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase {productAddonStates[addon.id] === 'active' ? 'bg-emerald-50 text-emerald-700' : productAddonStates[addon.id] === 'inactive' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}">
																	{productAddonStates[addon.id] ?? 'default'}
																</span>
															</td>
															<td class="px-3 py-2">
																<div class="flex rounded-lg bg-slate-100 p-0.5 w-fit">
																	<button type="button" class="rounded px-2 py-1 text-[10px] font-semibold {productAddonStates[addon.id] === undefined ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}" onclick={() => setProductAddonState(addon.id, 'default')}>Default</button>
																	<button type="button" class="rounded px-2 py-1 text-[10px] font-semibold {productAddonStates[addon.id] === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}" onclick={() => setProductAddonState(addon.id, 'active')}>Aktif</button>
																	<button type="button" class="rounded px-2 py-1 text-[10px] font-semibold {productAddonStates[addon.id] === 'inactive' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}" onclick={() => setProductAddonState(addon.id, 'inactive')}>Nonaktif</button>
																</div>
															</td>
														</tr>
													{:else}
														<tr>
															<td colspan="3" class="px-3 py-6 text-center text-xs text-slate-500">Tidak ada addon yang cocok dengan pencarian.</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
				
				<div class="grid gap-3 md:col-span-2 mt-2 pt-4 border-t border-slate-100">
					<div class="flex items-center justify-between">
						<Label class="text-sm font-semibold text-slate-800">Product Images (Max 5)</Label>
						<span class="text-xs font-medium text-slate-500">{existingImages.length + newImages.length} / 5</span>
					</div>
					
					<div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
						<!-- Existing Images -->
						{#each existingImages as img, i}
							<div class="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
								<img src={getImageUrl(img.image_url, { width: 320, height: 320, quality: 75, resize: 'cover' })} alt="Product" class="w-full h-full object-cover" loading="lazy" decoding="async" />
								<button type="button" onclick={() => removeExistingImage(img)} aria-label={`Hapus gambar produk ${i + 1}`} class="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
								</button>
								{#if i === 0 && newImages.length === 0}
									<span class="absolute bottom-1 left-1 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full font-medium">Primary</span>
								{/if}
							</div>
						{/each}

						<!-- New Images -->
						{#each newImages as img, i}
							<div class="relative aspect-square rounded-xl overflow-hidden border border-blue-200 group">
								<img src={img.previewUrl} alt="New Preview" class="w-full h-full object-cover" />
								<button type="button" onclick={() => removeNewImage(i)} aria-label={`Hapus gambar baru ${i + 1}`} class="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
								</button>
								<span class="absolute top-1 left-1 bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Baru</span>
								{#if existingImages.length === 0 && i === 0}
									<span class="absolute bottom-1 left-1 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full font-medium">Primary</span>
								{/if}
							</div>
						{/each}

						<!-- Upload Button (if < 5) -->
						{#if existingImages.length + newImages.length < 5}
							<Label for="images_upload" class="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-500 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-slate-700">
								<svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
								<span class="text-[10px] font-semibold uppercase tracking-wider">Tambah</span>
								<Input id="images_upload" name="images_upload" type="file" accept="image/*" multiple class="hidden" onchange={handleFileChange} />
							</Label>
						{/if}
					</div>
					<p class="text-[11px] text-muted-foreground mt-1">Gambar pertama otomatis menjadi gambar utama.</p>
				</div>
				
				<div class="flex items-center gap-2 md:col-span-2 mt-2">
					<input type="checkbox" id="is_available" name="is_available" checked={editingProduct ? editingProduct.is_available : true} class="rounded border-gray-300 w-4 h-4 text-slate-800 focus:ring-slate-800" />
					<Label for="is_available" class="font-medium cursor-pointer">Available for order</Label>
				</div>
				
				<div class="md:col-span-2 mt-4 flex gap-3">
					<Button type="button" variant="outline" class="flex-1 md:flex-none cursor-pointer active:scale-95 transition-transform" onclick={() => isFormOpen = false} disabled={isSubmitting}>Cancel</Button>
					<Button type="submit" class="flex-1 md:flex-none bg-slate-800 hover:bg-slate-900 hover:shadow-md cursor-pointer active:scale-95 transition-all" disabled={isSubmitting}>
						{#if isSubmitting}
							Menyimpan...
						{:else}
							{editingProduct ? 'Simpan Perubahan' : 'Save Product'}
						{/if}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
{/if}

{#if isCreateCategoryModalOpen}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<button type="button" class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" transition:fade={{ duration: 150 }} onclick={closeCreateCategoryModal} aria-label="Tutup modal create category"></button>
		<div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" transition:fly={{ y: 16, duration: 180 }}>
			<h3 class="text-lg font-bold text-slate-800">Buat Category Baru?</h3>
			<p class="mt-2 text-sm leading-relaxed text-slate-600">
				Category "{pendingCategoryName}" belum tersedia. Yakin ingin membuat category ini?
			</p>

			{#if categoryCreateError}
				<div class="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
					{categoryCreateError}
				</div>
			{/if}

			<form
				method="POST"
				action="?/createCategory"
				use:enhance={() => {
					isCreatingCategory = true;
					categoryCreateError = '';
					return async ({ update, result }) => {
						await update({ reset: false });
						isCreatingCategory = false;
						if (result.type === 'success' && result.data?.success && result.data?.category) {
							const category = result.data.category;
							categories = [...categories, category].sort((a, b) => a.name.localeCompare(b.name));
							selectCategory(category);
							categoryCreateSuccess = `Category "${category.name}" berhasil dibuat.`;
							closeCreateCategoryModal();
						} else if (result.type === 'success' && result.data?.error) {
							categoryCreateError = result.data.error;
						} else if (result.type === 'failure') {
							categoryCreateError = result.data?.error || 'Gagal membuat category.';
						} else if (result.type === 'error') {
							categoryCreateError = 'Gagal membuat category.';
						}
					};
				}}
				class="mt-6 flex gap-3"
			>
				<input type="hidden" name="name" value={pendingCategoryName} />
				<Button type="button" variant="outline" class="flex-1" disabled={isCreatingCategory} onclick={closeCreateCategoryModal}>Cancel</Button>
				<Button type="submit" class="flex-1 bg-primary hover:bg-[#724828]" disabled={isCreatingCategory}>
					{isCreatingCategory ? 'Creating...' : 'Create Category'}
				</Button>
			</form>
		</div>
	</div>
{/if}

<div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-8">
	<div class="overflow-x-auto">
		<Table.Root class="min-w-[800px]">
			<Table.Header class="bg-slate-50/50">
			<Table.Row>
				<Table.Head class="w-[80px] font-semibold text-slate-600">Image</Table.Head>
				<Table.Head class="font-semibold text-slate-600">Name & Category</Table.Head>
				<Table.Head class="font-semibold text-slate-600">Start from</Table.Head>
				<Table.Head class="font-semibold text-slate-600">Status</Table.Head>
				<Table.Head class="text-right font-semibold text-slate-600">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each data.products as product (product.id)}
				<Table.Row class="hover:bg-slate-50/50 transition-colors">
					<Table.Cell>
						{#if product.product_images && product.product_images.length > 0}
							{@const primaryImg = product.product_images.find(img => img.is_primary) || product.product_images[0]}
							<div class="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shadow-sm border border-slate-200">
								<img src={getImageUrl(primaryImg.image_url, { width: 96, height: 96, quality: 75, resize: 'cover' })} alt={product.name} class="w-full h-full object-cover" loading="lazy" decoding="async" />
							</div>
						{:else}
							<div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-400">
								No Img
							</div>
						{/if}
					</Table.Cell>
					<Table.Cell>
						<div class="font-bold text-slate-800 text-[15px]">{product.name}</div>
						{#if product.category}
							<Badge variant="outline" class="mt-1.5 text-[10px] bg-slate-50 text-slate-600 border-slate-200">{product.category.name}</Badge>
						{/if}
					</Table.Cell>
					<Table.Cell>
						<span class="font-semibold text-slate-700">{formatCurrency(getStartFromPrice(product))}</span>
					</Table.Cell>
					<Table.Cell>
						<form method="POST" action="?/toggleAvailability" use:enhance>
							<input type="hidden" name="id" value={product.id} />
							<input type="hidden" name="is_available" value={product.is_available.toString()} />
							<button type="submit" class="hover:opacity-80 transition-opacity">
								{#if product.is_available}
									<Badge class="bg-emerald-500 hover:bg-emerald-600 shadow-sm border-0">Available</Badge>
								{:else}
									<Badge variant="secondary" class="bg-slate-200 text-slate-600 hover:bg-slate-300">Unavailable</Badge>
								{/if}
							</button>
						</form>
					</Table.Cell>
					<Table.Cell class="text-right">
						<div class="flex items-center justify-end gap-2">
							<Button variant="outline" size="sm" class="h-8 text-xs font-semibold" onclick={() => openDetail(product)}>Detail</Button>
							<Button variant="outline" size="sm" class="h-8 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50" onclick={() => openEditForm(product)}>Edit</Button>
							<form method="POST" action="?/deleteProduct" use:enhance onsubmit={(e) => {
								if(!confirm(`Yakin ingin menghapus produk "${product.name}"?`)) e.preventDefault();
							}}>
								<input type="hidden" name="id" value={product.id} />
								<Button type="submit" variant="destructive" size="sm" class="h-8 text-xs font-semibold">Delete</Button>
							</form>
						</div>
					</Table.Cell>
				</Table.Row>
			{:else}
				<Table.Row>
					<Table.Cell colspan="5" class="text-center py-12">
						<div class="flex flex-col items-center justify-center text-slate-400">
							<svg class="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
							<p class="font-medium text-sm">Belum ada produk yang ditambahkan.</p>
							<Button variant="outline" size="sm" class="mt-4" onclick={openCreateForm}>Tambah Produk Pertama</Button>
						</div>
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
		</Table.Root>
	</div>

	<div class="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
		<p class="text-sm text-slate-500">
			Menampilkan <span class="font-semibold text-slate-700">{pagination.from}</span>-<span class="font-semibold text-slate-700">{pagination.to}</span>
			dari <span class="font-semibold text-slate-700">{pagination.totalProducts}</span> produk
		</p>
		<div class="flex items-center justify-between gap-2 sm:justify-end">
			<a
				href={getPageHref(pagination.page - 1)}
				aria-disabled={!canGoPrev}
				tabindex={canGoPrev ? 0 : -1}
				class="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 {canGoPrev ? '' : 'pointer-events-none opacity-50'}"
			>
				Previous
			</a>
			<span class="min-w-24 text-center text-sm font-semibold text-slate-700">
				Page {pagination.page} / {pagination.totalPages}
			</span>
			<a
				href={getPageHref(pagination.page + 1)}
				aria-disabled={!canGoNext}
				tabindex={canGoNext ? 0 : -1}
				class="inline-flex h-9 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 {canGoNext ? '' : 'pointer-events-none opacity-50'}"
			>
				Next
			</a>
		</div>
	</div>
</div>

<!-- BOTTOM SHEET DRAWER FOR DETAIL -->
{#if isDrawerOpen && selectedProductDetail}
	<div class="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
		<button class="absolute inset-0 w-full h-full bg-slate-900/40 backdrop-blur-sm cursor-default" transition:fade={{duration: 200}} onclick={closeDetail} aria-label="Close modal"></button>
		
		<div class="relative bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-safe-12 w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]" transition:fly={{ y: '100%', duration: 350, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}>
			<div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>
			
			<div class="flex justify-between items-start mb-6 shrink-0">
				<div>
					<h3 class="text-2xl font-bold text-slate-800 mb-1">{selectedProductDetail.name}</h3>
					<div class="flex items-center gap-2">
						{#if selectedProductDetail.category}
							<Badge variant="outline" class="bg-slate-50 text-slate-600">{selectedProductDetail.category.name}</Badge>
						{/if}
						{#if selectedProductDetail.is_available}
							<Badge class="bg-emerald-100 text-emerald-800 border-emerald-200">Available</Badge>
						{:else}
							<Badge variant="secondary" class="bg-slate-100 text-slate-600">Unavailable</Badge>
						{/if}
					</div>
				</div>
				<button onclick={closeDetail} aria-label="Tutup detail produk" class="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>

			<div class="overflow-y-auto pr-2 pb-4 flex-1 space-y-6">
				<!-- Images Gallery -->
				{#if selectedProductDetail.product_images && selectedProductDetail.product_images.length > 0}
					<div>
						<h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Galeri Produk</h4>
						<div class="flex gap-3 overflow-x-auto pb-2 snap-x">
							{#each selectedProductDetail.product_images as img}
								<div class="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 snap-start border border-slate-200 shadow-sm">
									<img src={getImageUrl(img.image_url, { width: 224, height: 224, quality: 75, resize: 'cover' })} alt="Product Galeri" class="w-full h-full object-cover" loading="lazy" decoding="async" />
									{#if img.is_primary}
										<span class="absolute bottom-1 right-1 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full font-medium">Primary</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Details -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
					<div>
						<h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Start From</h4>
						<p class="font-bold text-slate-800 text-lg">{formatCurrency(getStartFromPrice(selectedProductDetail))}</p>
					</div>
					<div class="sm:col-span-2">
						<h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi</h4>
						<p class="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedProductDetail.description || '-'}</p>
					</div>
				</div>

				<hr class="border-slate-100" />

				<!-- Customization -->
				<div>
					<h4 class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Opsi Kustomisasi</h4>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#each Object.entries(groupAddons(getProductAddons(selectedProductDetail))) as [category, addons]}
							<div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
								<span class="block text-xs font-semibold text-slate-500 mb-1 capitalize">{category}</span>
								<p class="text-sm font-medium text-slate-800">{addons.map((addon) => addon.name).join(', ')}</p>
							</div>
						{/each}
						{#if getProductAddons(selectedProductDetail).length === 0}
							<div class="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
								<p class="text-sm font-medium text-slate-600">Menggunakan global addons default.</p>
							</div>
						{/if}
					</div>
				</div>
				
				<div class="pt-4 flex gap-3">
					<Button onclick={() => {
						closeDetail();
						openEditForm(selectedProductDetail);
					}} class="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20">Edit Produk Ini</Button>
				</div>
			</div>
		</div>
	</div>
{/if}
