<script>
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { AdminEmptyState, AdminPage, AdminPageHeader } from '$lib/components/admin';
	import { getImageUrl } from '$lib/image-url.js';
	import { getStartFromPrice } from '$lib/pricing.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import PackageOpenIcon from '@lucide/svelte/icons/package-open';

	let { data } = $props();

	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount ?? 0);
	}
</script>

<svelte:head><title>{data.category.name} | Categories | dessertbyfir Admin</title></svelte:head>

<AdminPage>
	<AdminPageHeader
		title={data.category.name}
		description={`${data.products.length} produk dalam kategori ini.`}
		eyebrow="Kategori Produk"
	>
		{#snippet actions()}
			<Button href="/admin/dashboard/categories" variant="outline">
				<ArrowLeftIcon data-icon="inline-start" />
				Kembali
			</Button>
			<Button href={`/admin/dashboard/products?category=${encodeURIComponent(data.category.id)}`}>
				Kelola Produk
			</Button>
		{/snippet}
	</AdminPageHeader>

	{#if data.products.length > 0}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each data.products as product (product.id)}
				{@const primaryImage = product.product_images?.find((image) => image.is_primary) ?? product.product_images?.[0]}
				<Card.Root class="overflow-hidden">
					<div class="aspect-[16/10] overflow-hidden bg-muted">
						{#if primaryImage}
							<img
								src={getImageUrl(primaryImage.image_url, { width: 640, height: 400, quality: 78, resize: 'cover' })}
								alt={product.name}
								class="size-full object-cover"
								loading="lazy"
								decoding="async"
							/>
						{:else}
							<div class="flex size-full items-center justify-center text-muted-foreground">
								<PackageOpenIcon class="size-8" aria-hidden="true" />
								<span class="sr-only">Tidak ada gambar</span>
							</div>
						{/if}
					</div>
					<Card.Header class="gap-3">
						<div class="flex items-start justify-between gap-3">
							<Card.Title class="min-w-0 truncate text-base">{product.name}</Card.Title>
							<Badge variant={product.is_active ? 'default' : 'secondary'}>
								{product.is_active ? 'Aktif' : 'Nonaktif'}
							</Badge>
						</div>
						<Card.Description class="flex items-center justify-between gap-3">
							<span>Mulai dari {formatCurrency(getStartFromPrice(product))}</span>
							<span>{product.is_available ? 'Tersedia' : 'Tidak tersedia'}</span>
						</Card.Description>
					</Card.Header>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<AdminEmptyState
			title="Belum ada produk"
			description={`Belum ada produk yang dimasukkan ke kategori ${data.category.name}.`}
			icon={PackageOpenIcon}
		>
			{#snippet action()}
				<Button href={`/admin/dashboard/products?category=${encodeURIComponent(data.category.id)}`}>Kelola Produk</Button>
			{/snippet}
		</AdminEmptyState>
	{/if}
</AdminPage>
