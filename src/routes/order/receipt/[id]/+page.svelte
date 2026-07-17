<script>
	import { getWhatsAppHref } from '$lib/site-info.js';

	let { data } = $props();
	let order = $derived(data.order);
	let siteInfo = $derived(data.siteInfo);
	let whatsappHref = $derived(getWhatsAppHref(siteInfo.whatsapp_number));
	let orderNumber = $derived(order.order_number ? `#${order.order_number}` : `#${String(order.id).slice(0, 8)}`);
	let items = $derived(getItems(order));

	function getItems(currentOrder) {
		if (currentOrder.order_items?.length) {
			return currentOrder.order_items.map((item) => ({
				name: item.products?.name || 'Produk',
				quantity: item.quantity || 1,
				size: item.customized_options?.size?.name || item.cake_size || '-',
				flavor: item.customized_options?.flavor?.name || item.cake_flavor || '-',
				subtotal: item.estimated_subtotal || (item.estimated_unit_price || item.price_at_order || 0) * (item.quantity || 1)
			}));
		}

		return [
			{
				name: currentOrder.products?.name || 'Produk',
				quantity: currentOrder.quantity || 1,
				size: currentOrder.customized_options?.size?.name || currentOrder.cake_size || '-',
				flavor: currentOrder.customized_options?.flavor?.name || currentOrder.cake_flavor || '-',
				subtotal: currentOrder.estimated_subtotal || currentOrder.amount || 0
			}
		];
	}

	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(Number(amount) || 0);
	}

	function formatDate(dateString) {
		if (!dateString) return '-';

		return new Date(dateString).toLocaleDateString('id-ID', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Pesanan {orderNumber} diterima</title>
</svelte:head>

<div class="min-h-screen bg-[#FFFBF7] px-4 py-8 font-sans text-[#4A3B32] sm:py-14">
	<div class="mx-auto max-w-3xl">
		<section class="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
			<div class="border-b border-primary/10 bg-[#fff6ed] px-6 py-8 sm:px-8">
				<div class="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-white">
					<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7"></path>
					</svg>
				</div>
				<p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary/80">Pesanan terkirim</p>
				<h1 class="font-['Playfair_Display'] text-3xl font-bold leading-tight sm:text-4xl">Terima kasih, pesanan kamu sudah kami terima.</h1>
				<p class="mt-4 max-w-2xl text-sm leading-6 text-[#4A3B32]/70 sm:text-base">
					Status pesanan {orderNumber} saat ini masih <span class="font-bold text-amber-700">Pending</span>. Admin sedang mengecek detail pesanan dan akan memprosesnya segera.
				</p>
			</div>

			<div class="grid gap-6 p-6 sm:p-8">
				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-2xl border border-primary/10 bg-[#FFFBF7] p-4">
						<p class="text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]/50">No. Order</p>
						<p class="mt-1 text-lg font-extrabold">{orderNumber}</p>
					</div>
					<div class="rounded-2xl border border-primary/10 bg-[#FFFBF7] p-4">
						<p class="text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]/50">Status</p>
						<p class="mt-1 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">{order.status || 'Pending'}</p>
					</div>
					<div class="rounded-2xl border border-primary/10 bg-[#FFFBF7] p-4">
						<p class="text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]/50">Estimasi Total</p>
						<p class="mt-1 text-lg font-extrabold text-primary">{formatCurrency(order.amount)}</p>
					</div>
				</div>

				<div class="rounded-2xl border border-primary/10">
					<div class="border-b border-primary/10 px-4 py-3">
						<h2 class="font-bold">Ringkasan Pesanan</h2>
					</div>
					<div class="divide-y divide-primary/10">
						{#each items as item}
							<div class="flex items-start justify-between gap-4 px-4 py-4">
								<div>
									<p class="font-bold">{item.name}</p>
									<p class="mt-1 text-sm text-[#4A3B32]/60">{item.quantity}x · Ukuran {item.size} · Rasa {item.flavor}</p>
								</div>
								<p class="shrink-0 text-sm font-bold text-primary">{formatCurrency(item.subtotal)}</p>
							</div>
						{/each}
					</div>
				</div>

				<div class="grid gap-4 rounded-2xl border border-primary/10 bg-[#FFFBF7] p-4 sm:grid-cols-2">
					<div>
						<p class="text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]/50">Jadwal</p>
						<p class="mt-1 font-bold">{formatDate(order.delivery_date)}</p>
						<p class="text-sm text-[#4A3B32]/65">{order.delivery_time || '-'}</p>
					</div>
					<div>
						<p class="text-[11px] font-bold uppercase tracking-wider text-[#4A3B32]/50">Kontak Admin</p>
						<p class="mt-1 font-bold">{siteInfo.whatsapp_number}</p>
						<p class="text-sm text-[#4A3B32]/65">Email konfirmasi juga dikirim ke {order.email || 'email kamu'}.</p>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row">
					{#if whatsappHref}
						<a href={whatsappHref} target="_blank" rel="noreferrer" class="inline-flex flex-1 items-center justify-center rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#1fb95a]">
							Hubungi Admin WhatsApp
						</a>
					{/if}
					<a href="/catalog" class="inline-flex flex-1 items-center justify-center rounded-xl border border-primary/20 px-5 py-3.5 text-sm font-bold text-primary transition-colors hover:bg-primary/10">
						Lihat Catalog Lagi
					</a>
				</div>
			</div>
		</section>
	</div>
</div>
