<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Card from '$lib/components/ui/card';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
	import { slugify, buildFormUrl, buildWhatsAppShareMessage } from '$lib/order-forms.js';
	import { getImageUrl } from '$lib/image-url.js';
	import Copy from '@lucide/svelte/icons/copy';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import QrCode from '@lucide/svelte/icons/qr-code';
	import Plus from '@lucide/svelte/icons/plus';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Check from '@lucide/svelte/icons/check';
	import Edit from '@lucide/svelte/icons/edit';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Link2 from '@lucide/svelte/icons/link-2';
	import Share2 from '@lucide/svelte/icons/share-2';
	import Cake from '@lucide/svelte/icons/cake';

	let { data, form } = $props();

	let products = $derived(data.products ?? []);
	let orderForms = $derived(data.orderForms ?? []);
	let siteInfo = $derived(data.siteInfo);

	// Quick Link Generator State
	let selectedQuickProduct = $state('');
	let origin = $derived(typeof window !== 'undefined' ? window.location.origin : '');

	let generatedQuickUrl = $derived(
		buildFormUrl(
			origin,
			'/order-form',
			selectedQuickProduct ? { product: selectedQuickProduct } : {}
		)
	);

	let selectedQuickProductObj = $derived(
		products.find((p) => p.id === selectedQuickProduct) ?? null
	);

	// Modal States
	let isCreateModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isWaModalOpen = $state(false);
	let isQrModalOpen = $state(false);
	let editingForm = $state(null);
	let isSubmitting = $state(false);

	// Custom Form Form Fields
	let formTitle = $state('');
	let formSlug = $state('');
	let formProductId = $state('');
	let formDescription = $state('');
	let formBannerText = $state('');

	// WhatsApp share dialog state
	let waTargetUrl = $state('');
	let waTargetTitle = $state('');
	let waCustomMessage = $state('');

	function copyToClipboard(text, message = 'Link berhasil disalin!') {
		if (navigator?.clipboard?.writeText) {
			navigator.clipboard.writeText(text);
			toast.success(message);
		}
	}

	function handleTitleChange(val) {
		formTitle = val;
		if (!editingForm) {
			formSlug = slugify(val);
		}
	}

	function openCreateModal() {
		editingForm = null;
		formTitle = '';
		formSlug = '';
		formProductId = '';
		formDescription = '';
		formBannerText = '';
		isCreateModalOpen = true;
	}

	function openEditModal(f) {
		editingForm = f;
		formTitle = f.title || '';
		formSlug = f.slug || '';
		formProductId = f.product_id || '';
		formDescription = f.description || '';
		formBannerText = f.banner_text || '';
		isEditModalOpen = true;
	}

	function openWaModal(url, title, productName = '') {
		waTargetUrl = url;
		waTargetTitle = title;
		waCustomMessage = buildWhatsAppShareMessage(siteInfo, {
			formUrl: url,
			formTitle: title,
			productName
		});
		isWaModalOpen = true;
	}

	function openQrModal(url, title) {
		waTargetUrl = url;
		waTargetTitle = title;
		isQrModalOpen = true;
	}
</script>

<svelte:head>
	<title>Form Pembelian & Generator | dessertbyfir Admin</title>
</svelte:head>

<div class="space-y-6">
	<AdminPageHeader
		title="Form Pembelian & Generator"
		description="Buat dan bagikan link formulir pemesanan langsung untuk pelanggan tanpa lewat landing page/cart."
	>
		{#snippet actions()}
			<Button onclick={openCreateModal} class="gap-2 shadow-sm">
				<Plus class="size-4" />
				<span>Buat Form Campaign</span>
			</Button>
		{/snippet}
	</AdminPageHeader>

	<!-- Quick Generator Section -->
	<Card.Root class="border-primary/20 bg-gradient-to-br from-white to-[#FFFBF7] shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<Sparkles class="size-4" />
				</span>
				<div>
					<Card.Title class="text-base font-bold text-[#4A3B32]">Generator Link Form Cepat</Card.Title>
					<Card.Description class="text-xs">
						Pilih produk atau buat link umum untuk dibagikan langsung ke pelanggan atau WhatsApp.
					</Card.Description>
				</div>
			</div>
		</Card.Header>

		<Card.Content class="space-y-4 pt-1">
			<div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
				<div class="md:col-span-4 space-y-1.5">
					<Label for="quick-product-select" class="text-xs font-semibold text-muted-foreground">Target Produk</Label>
					<select
						id="quick-product-select"
						bind:value={selectedQuickProduct}
						class="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
					>
						<option value="">Semua Produk (Form Umum)</option>
						{#each products as prod}
							<option value={prod.id}>{prod.name} ({prod.categories?.name || 'Kue'})</option>
						{/each}
					</select>
				</div>

				<div class="md:col-span-8 space-y-1.5">
					<Label for="generated-url" class="text-xs font-semibold text-muted-foreground">Link Formulir Pembelian</Label>
					<div class="flex items-center gap-2">
						<Input
							id="generated-url"
							readonly
							value={generatedQuickUrl}
							class="bg-muted/40 font-mono text-xs text-foreground select-all"
						/>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => copyToClipboard(generatedQuickUrl, 'Link form berhasil disalin!')}
							class="gap-1.5 shrink-0"
						>
							<Copy class="size-3.5" />
							<span>Salin</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => openWaModal(generatedQuickUrl, 'Form Pembelian', selectedQuickProductObj?.name)}
							class="gap-1.5 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
						>
							<MessageCircle class="size-3.5" />
							<span>Share WA</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => openQrModal(generatedQuickUrl, selectedQuickProductObj?.name || 'Form Pembelian')}
							class="gap-1.5 shrink-0"
						>
							<QrCode class="size-3.5" />
							<span>QR</span>
						</Button>
						<a
							href={generatedQuickUrl}
							target="_blank"
							rel="noreferrer"
							class="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
						>
							<ExternalLink class="size-3.5" />
						</a>
					</div>
				</div>
			</div>

			<!-- Quick Hint -->
			<div class="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary/80">
				<Link2 class="size-3.5 shrink-0" />
				<span>
					Link statis utama: <strong class="font-mono">{origin}/order-form</strong> atau <strong class="font-mono">{origin}/form</strong>. Pelanggan dapat langsung memilih kue, varian, dan mengisi data pesanan tanpa lewat katalog.
				</span>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Custom Forms Table Section -->
	<Card.Root class="shadow-sm">
		<Card.Header class="pb-3">
			<div class="flex items-center justify-between">
				<div>
					<Card.Title class="text-base font-bold">Daftar Form Campaign Kustom</Card.Title>
					<Card.Description class="text-xs">
						Form kustom dengan link/slug unik (contoh: <span class="font-mono">/form/kue-ultah</span>) dan banner khusus.
					</Card.Description>
				</div>
			</div>
		</Card.Header>

		<Card.Content class="p-0">
			{#if orderForms.length === 0}
				<div class="p-6">
					<AdminEmptyState
						title="Belum ada form campaign khusus"
						description="Buat form campaign dengan custom slug untuk mempromosikan produk tertentu atau event spesial."
					>
						{#snippet actions()}
							<Button size="sm" onclick={openCreateModal} class="gap-1.5">
								<Plus class="size-4" />
								<span>Buat Form Pertama</span>
							</Button>
						{/snippet}
					</AdminEmptyState>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Judul Form & Banner</Table.Head>
							<Table.Head>Slug & Link</Table.Head>
							<Table.Head>Produk</Table.Head>
							<Table.Head class="text-center">Status</Table.Head>
							<Table.Head class="text-center">Statistik</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each orderForms as item (item.id)}
							{@const fullUrl = `${origin}/form/${item.slug}`}
							<Table.Row>
								<Table.Cell>
									<div>
										<p class="font-bold text-sm text-foreground">{item.title}</p>
										{#if item.banner_text}
											<p class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.banner_text}</p>
										{/if}
									</div>
								</Table.Cell>

								<Table.Cell>
									<div class="flex items-center gap-1.5">
										<code class="rounded bg-muted px-2 py-0.5 font-mono text-xs text-primary font-semibold">
											/form/{item.slug}
										</code>
										<button
											type="button"
											onclick={() => copyToClipboard(fullUrl, `Link /form/${item.slug} disalin!`)}
											class="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
											title="Salin Link"
										>
											<Copy class="size-3.5" />
										</button>
									</div>
								</Table.Cell>

								<Table.Cell>
									{#if item.products}
										<div class="flex items-center gap-2">
											<div class="size-7 rounded bg-muted overflow-hidden shrink-0">
												{#if item.products.product_images?.[0]?.image_url}
													<img src={getImageUrl(item.products.product_images[0].image_url, { width: 50, height: 50 })} alt="" class="size-full object-cover" />
												{/if}
											</div>
											<span class="text-xs font-medium truncate max-w-[140px]">{item.products.name}</span>
										</div>
									{:else}
										<Badge variant="outline" class="text-[11px]">Semua Produk</Badge>
									{/if}
								</Table.Cell>

								<Table.Cell class="text-center">
									<form
										action="?/toggleStatus"
										method="POST"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
												toast.success('Status form diperbarui');
											};
										}}
									>
										<input type="hidden" name="id" value={item.id} />
										<input type="hidden" name="is_active" value={item.is_active ? 'false' : 'true'} />
										<button
											type="submit"
											class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all {item.is_active ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
										>
											{item.is_active ? 'Aktif' : 'Nonaktif'}
										</button>
									</form>
								</Table.Cell>

								<Table.Cell class="text-center">
									<div class="text-xs text-muted-foreground">
										<span title="Dilihat">{item.views_count || 0} views</span> • <strong class="text-foreground font-semibold" title="Jumlah Order">{item.orders_count || 0} order</strong>
									</div>
								</Table.Cell>

								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="icon"
											onclick={() => openWaModal(fullUrl, item.title, item.products?.name)}
											title="Bagikan ke WhatsApp"
											class="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
										>
											<MessageCircle class="size-4" />
										</Button>

										<Button
											variant="ghost"
											size="icon"
											onclick={() => openQrModal(fullUrl, item.title)}
											title="Lihat QR Code"
											class="size-8"
										>
											<QrCode class="size-4" />
										</Button>

										<a
											href={fullUrl}
											target="_blank"
											rel="noreferrer"
											class="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
											title="Buka Halaman Form"
										>
											<ExternalLink class="size-4" />
										</a>

										<Button
											variant="ghost"
											size="icon"
											onclick={() => openEditModal(item)}
											title="Edit Form"
											class="size-8"
										>
											<Edit class="size-4" />
										</Button>

										<form
											action="?/deleteForm"
											method="POST"
											use:enhance={() => {
												if (!confirm(`Hapus form "${item.title}"?`)) return false;
												return async ({ update }) => {
													await update();
													toast.success('Form berhasil dihapus');
												};
											}}
										>
											<input type="hidden" name="id" value={item.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon"
												title="Hapus Form"
												class="size-8 text-destructive hover:bg-destructive/10"
											>
												<Trash2 class="size-4" />
											</Button>
										</form>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Modal: Create / Edit Form -->
<Dialog.Root bind:open={isCreateModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Buat Form Pembelian Baru</Dialog.Title>
			<Dialog.Description>
				Tentukan judul, custom slug, dan opsi banner untuk form pemesanan langsung.
			</Dialog.Description>
		</Dialog.Header>

		<form
			action="?/createForm"
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						isCreateModalOpen = false;
						toast.success('Form pembelian berhasil dibuat!');
					}
					await update();
				};
			}}
			class="space-y-4 pt-2"
		>
			<div class="space-y-1.5">
				<Label for="create-title">Judul Form <span class="text-destructive">*</span></Label>
				<Input
					id="create-title"
					name="title"
					required
					placeholder="Contoh: Form Pemesanan Kue Ulang Tahun"
					bind:value={formTitle}
					oninput={(e) => handleTitleChange(e.target.value)}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="create-slug">Slug Link <span class="text-destructive">*</span></Label>
				<div class="flex items-center gap-1.5">
					<span class="text-xs text-muted-foreground font-mono">/form/</span>
					<Input
						id="create-slug"
						name="slug"
						required
						placeholder="kue-ulang-tahun"
						bind:value={formSlug}
					/>
				</div>
			</div>

			<div class="space-y-1.5">
				<Label for="create-product">Kunci Produk (Opsional)</Label>
				<select
					id="create-product"
					name="product_id"
					bind:value={formProductId}
					class="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
				>
					<option value="">Semua Produk (Pelanggan bisa memilih)</option>
					{#each products as prod}
						<option value={prod.id}>{prod.name}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-1.5">
				<Label for="create-banner">Teks Banner Promo / Pengumuman</Label>
				<Input
					id="create-banner"
					name="banner_text"
					placeholder="Contoh: Promo Diskon 10% Khusus Order Minggu Ini"
					bind:value={formBannerText}
				/>
			</div>

			<div class="space-y-1.5">
				<Label for="create-desc">Deskripsi Tambahan</Label>
				<Textarea
					id="create-desc"
					name="description"
					rows="2"
					placeholder="Keterangan singkat tentang penawaran atau panduan pemesanan..."
					bind:value={formDescription}
				/>
			</div>

			<Dialog.Footer class="pt-2">
				<Button type="button" variant="outline" onclick={() => (isCreateModalOpen = false)}>Batal</Button>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Menyimpan...' : 'Buat Form'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Modal: Edit Form -->
<Dialog.Root bind:open={isEditModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Edit Form Pembelian</Dialog.Title>
			<Dialog.Description>Perbarui data formulir pemesanan.</Dialog.Description>
		</Dialog.Header>

		{#if editingForm}
			<form
				action="?/updateForm"
				method="POST"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							isEditModalOpen = false;
							toast.success('Form pembelian berhasil diperbarui!');
						}
						await update();
					};
				}}
				class="space-y-4 pt-2"
			>
				<input type="hidden" name="id" value={editingForm.id} />

				<div class="space-y-1.5">
					<Label for="edit-title">Judul Form <span class="text-destructive">*</span></Label>
					<Input id="edit-title" name="title" required bind:value={formTitle} />
				</div>

				<div class="space-y-1.5">
					<Label for="edit-slug">Slug Link <span class="text-destructive">*</span></Label>
					<div class="flex items-center gap-1.5">
						<span class="text-xs text-muted-foreground font-mono">/form/</span>
						<Input id="edit-slug" name="slug" required bind:value={formSlug} />
					</div>
				</div>

				<div class="space-y-1.5">
					<Label for="edit-product">Kunci Produk</Label>
					<select
						id="edit-product"
						name="product_id"
						bind:value={formProductId}
						class="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
					>
						<option value="">Semua Produk (Pelanggan bisa memilih)</option>
						{#each products as prod}
							<option value={prod.id}>{prod.name}</option>
						{/each}
					</select>
				</div>

				<div class="space-y-1.5">
					<Label for="edit-banner">Teks Banner</Label>
					<Input id="edit-banner" name="banner_text" bind:value={formBannerText} />
				</div>

				<div class="space-y-1.5">
					<Label for="edit-desc">Deskripsi</Label>
					<Textarea id="edit-desc" name="description" rows="2" bind:value={formDescription} />
				</div>

				<Dialog.Footer class="pt-2">
					<Button type="button" variant="outline" onclick={() => (isEditModalOpen = false)}>Batal</Button>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Modal: WhatsApp Share -->
<Dialog.Root bind:open={isWaModalOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-emerald-700">
				<MessageCircle class="size-5" />
				<span>Bagikan ke WhatsApp</span>
			</Dialog.Title>
			<Dialog.Description>
				Salin template pesan atau buka WhatsApp secara langsung untuk mengirim link form ke pelanggan.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3 pt-2">
			<div class="space-y-1.5">
				<Label for="wa-message" class="text-xs">Preview Pesan WhatsApp</Label>
				<Textarea
					id="wa-message"
					bind:value={waCustomMessage}
					rows="7"
					class="font-sans text-xs leading-relaxed"
				/>
			</div>

			<div class="flex items-center justify-between gap-2 pt-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="gap-1.5"
					onclick={() => copyToClipboard(waCustomMessage, 'Teks pesan WhatsApp disalin!')}
				>
					<Copy class="size-3.5" />
					<span>Salin Pesan</span>
				</Button>

				<a
					href={`https://wa.me/?text=${encodeURIComponent(waCustomMessage)}`}
					target="_blank"
					rel="noreferrer"
					class="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:bg-[#1fb95a] transition-colors"
				>
					<MessageCircle class="size-4" />
					<span>Buka WhatsApp</span>
				</a>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Modal: QR Code -->
<Dialog.Root bind:open={isQrModalOpen}>
	<Dialog.Content class="sm:max-w-xs text-center">
		<Dialog.Header>
			<Dialog.Title class="text-center">QR Code Form</Dialog.Title>
			<Dialog.Description class="text-center text-xs">
				Scan untuk langsung membuka form pemesanan
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex flex-col items-center justify-center p-4 space-y-4">
			<div class="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
				<img
					src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(waTargetUrl)}`}
					alt="QR Code"
					class="size-48 rounded-lg"
				/>
			</div>
			<p class="text-xs font-mono text-muted-foreground break-all max-w-[240px]">{waTargetUrl}</p>
			
			<div class="flex items-center gap-2 w-full">
				<Button
					type="button"
					variant="outline"
					size="sm"
					class="w-full gap-1.5"
					onclick={() => copyToClipboard(waTargetUrl, 'Link form disalin!')}
				>
					<Copy class="size-3.5" />
					<span>Salin Link</span>
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
