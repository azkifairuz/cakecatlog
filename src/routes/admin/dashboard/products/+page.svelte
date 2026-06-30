<script>
	import { enhance } from '$app/forms';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import { fly, fade } from 'svelte/transition';

	let { data, form } = $props();
	let isFormOpen = $state(false);
	let isSubmitting = $state(false);
	let editingProduct = $state(null);

	let newImages = $state([]);
	let existingImages = $state([]);
	let deletedImageIds = $state([]);

	// Detail drawer
	let selectedProductDetail = $state(null);
	let isDrawerOpen = $state(false);

	function openCreateForm() {
		editingProduct = null;
		newImages = [];
		existingImages = [];
		deletedImageIds = [];
		isFormOpen = true;
	}

	function openEditForm(product) {
		editingProduct = product;
		newImages = [];
		existingImages = product.product_images ? [...product.product_images] : [];
		deletedImageIds = [];
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

	function formatCurrency(amount) {
		if (!amount) return '-';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
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
					if (result.type !== 'failure' && result.type !== 'error') {
						isFormOpen = false;
						editingProduct = null;
						newImages = [];
						existingImages = [];
						deletedImageIds = [];
					}
				};
			}} class="grid gap-5 md:grid-cols-2">
				
				<div class="grid gap-2">
					<Label for="name">Product Name *</Label>
					<Input id="name" name="name" required value={editingProduct?.name ?? ''} class="bg-slate-50 focus:bg-white" />
				</div>
				
				<div class="grid gap-2 md:col-span-2">
					<Label for="category_id">Category</Label>
					<select id="category_id" name="category_id" value={editingProduct?.category_id ?? ''} class="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-white">
						<option value="">-- No Category --</option>
						{#each data.categories as category}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
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
					<h3 class="text-sm font-semibold text-slate-800">Product Customization Options</h3>
					<p class="text-xs text-muted-foreground mb-2">Pisahkan dengan koma jika lebih dari satu (contoh: Merah, Kuning)</p>
					
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="grid gap-2">
							<Label for="sizes">Ukuran (Sizes)</Label>
							<Input id="sizes" name="sizes" placeholder="Contoh: 8cm, 10cm, 12cm" value={editingProduct?.sizes ?? ''} class="bg-slate-50 focus:bg-white" />
						</div>
						<div class="grid gap-2">
							<Label for="colors">Warna (Colors)</Label>
							<Input id="colors" name="colors" placeholder="Contoh: Merah, Putih, Custom" value={editingProduct?.colors ?? ''} class="bg-slate-50 focus:bg-white" />
						</div>
						<div class="grid gap-2">
							<Label for="flavors">Rasa (Flavors)</Label>
							<Input id="flavors" name="flavors" placeholder="Contoh: Coklat, Vanilla, Red Velvet" value={editingProduct?.flavors ?? ''} class="bg-slate-50 focus:bg-white" />
						</div>
						<div class="grid gap-2">
							<Label for="crown_options">Pilihan Mahkota (Crown)</Label>
							<Input id="crown_options" name="crown_options" placeholder="Contoh: Gold, Silver, Rose Gold" value={editingProduct?.crown_options ?? ''} class="bg-slate-50 focus:bg-white" />
						</div>
						<div class="grid gap-2 md:col-span-2">
							<Label for="edible_glitter">Edible Glitter</Label>
							<Input id="edible_glitter" name="edible_glitter" placeholder="Contoh: Tersedia, Tidak Tersedia" value={editingProduct?.edible_glitter ?? ''} class="bg-slate-50 focus:bg-white" />
						</div>
					</div>
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
								<img src={img.image_url} alt="Product" class="w-full h-full object-cover" />
								<button type="button" onclick={() => removeExistingImage(img)} class="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
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
								<button type="button" onclick={() => removeNewImage(i)} class="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
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
								<img src={primaryImg.image_url} alt={product.name} class="w-full h-full object-cover" />
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
						<span class="font-semibold text-slate-700">{formatCurrency(product.base_price)}</span>
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
				<button onclick={closeDetail} class="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
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
									<img src={img.image_url} alt="Product Galeri" class="w-full h-full object-cover" />
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
						<p class="font-bold text-slate-800 text-lg">{formatCurrency(selectedProductDetail.base_price)}</p>
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
						<div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
							<span class="block text-xs font-semibold text-slate-500 mb-1">Ukuran (Sizes)</span>
							<p class="text-sm font-medium text-slate-800">{selectedProductDetail.sizes || '-'}</p>
						</div>
						<div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
							<span class="block text-xs font-semibold text-slate-500 mb-1">Warna (Colors)</span>
							<p class="text-sm font-medium text-slate-800">{selectedProductDetail.colors || '-'}</p>
						</div>
						<div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
							<span class="block text-xs font-semibold text-slate-500 mb-1">Rasa (Flavors)</span>
							<p class="text-sm font-medium text-slate-800">{selectedProductDetail.flavors || '-'}</p>
						</div>
						<div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
							<span class="block text-xs font-semibold text-slate-500 mb-1">Mahkota (Crowns)</span>
							<p class="text-sm font-medium text-slate-800">{selectedProductDetail.crown_options || '-'}</p>
						</div>
						<div class="bg-slate-50 p-3 rounded-xl border border-slate-100 sm:col-span-2">
							<span class="block text-xs font-semibold text-slate-500 mb-1">Edible Glitter</span>
							<p class="text-sm font-medium text-slate-800">{selectedProductDetail.edible_glitter || '-'}</p>
						</div>
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
