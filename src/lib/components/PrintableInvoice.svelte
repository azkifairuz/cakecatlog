<script>
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import { copyInvoiceAccount, formatInvoiceCurrency } from '$lib/order-invoice.js';
	import { getWhatsAppHref } from '$lib/site-info.js';

	let { invoice } = $props();
	let order = $derived(invoice.order);
	let orderNumber = $derived(order.orderNumber ? `#${order.orderNumber}` : `#${order.id.slice(0, 8)}`);
	let whatsappHref = $derived(getWhatsAppHref(invoice.store?.whatsappNumber));
	let copiedAccount = $state('');
	let copying = $state('');
	let copyError = $state('');

	async function copyAccount(account) {
		copying = account.id;
		copiedAccount = '';
		copyError = '';
		try { await copyInvoiceAccount(account.norek); copiedAccount = account.id; }
		catch { copyError = 'Nomor rekening belum dapat disalin otomatis. Pilih nomornya dan salin secara manual.'; }
		finally { copying = ''; }
	}
</script>

<svelte:head><title>Invoice {orderNumber} | Dessert By Fir</title><meta name="robots" content="noindex, nofollow" /></svelte:head>

<div class="min-h-screen bg-[#FFFBF7] px-4 py-8 text-[#4A3B32] sm:py-14">
	<article class="invoice-print mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
		<header class="border-b border-primary/10 bg-[#fff6ed] p-6 sm:p-8">
			<p class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Dessert By Fir</p>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="font-serif text-3xl font-bold">Invoice {orderNumber}</h1>
				<span class="rounded-full border border-primary/15 bg-white px-3 py-1 text-sm font-semibold">{order.status}</span>
			</div>
			<p class="mt-3 text-sm">Pesanan atas nama <strong>{order.customerName}</strong></p>
			<p class="mt-1 text-sm text-[#4A3B32]/65">{order.deliveryOption === 'pickup' ? 'Pickup' : 'Pengiriman'} · {order.deliveryDate} · {order.deliveryTime?.slice(0, 5) || '-'}</p>
		</header>

		<div class="space-y-6 p-6 sm:p-8">
			<section aria-labelledby="invoice-items">
				<h2 id="invoice-items" class="mb-3 text-lg font-bold">Detail pesanan</h2>
				<div class="divide-y divide-primary/10 rounded-2xl border border-primary/10">
					{#each invoice.items as item (item.id)}
						<div class="invoice-item space-y-2 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0"><h3 class="break-words font-bold">{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}</h3><p class="mt-1 text-sm text-[#4A3B32]/65">{item.quantity} × {formatInvoiceCurrency(item.unitPrice)}</p></div>
								<p class="font-bold text-primary">{formatInvoiceCurrency(item.subtotal)}</p>
							</div>
							<p class="text-sm text-[#4A3B32]/65">{[item.cakeSize, item.cakeFlavor, item.cakeColor].filter(Boolean).join(' · ')}</p>
							{#if item.cakeText}<p class="break-words text-sm">Tulisan kue: {item.cakeText}</p>{/if}
							{#if item.giftCardText}<p class="break-words text-sm">Kartu ucapan: {item.giftCardText}</p>{/if}
							{#if Array.isArray(item.customizedOptions?.addons) && item.customizedOptions.addons.length}<p class="break-words text-sm text-[#4A3B32]/65">{item.customizedOptions.addons.map((addon) => [addon.category, addon.name].filter(Boolean).join(': ')).join(' · ')}</p>{/if}
						</div>
					{/each}
				</div>
			</section>

			<section class="space-y-3 rounded-2xl bg-[#FFFBF7] p-4" aria-label="Rincian harga">
				<div class="flex justify-between gap-4 text-sm"><span>Subtotal produk</span><span>{formatInvoiceCurrency(invoice.totals.subtotal)}</span></div>
				<div class="flex justify-between gap-4 text-sm"><span>Ongkos kirim</span><span>{formatInvoiceCurrency(invoice.totals.deliveryFee)}</span></div>
				{#if invoice.totals.adjustment}<div class="flex justify-between gap-4 text-sm"><span>Penyesuaian harga</span><span>{formatInvoiceCurrency(invoice.totals.adjustment)}</span></div>{/if}
				<div class="flex flex-wrap justify-between gap-3 border-t border-primary/10 pt-3 text-lg font-bold"><span>Total pembayaran</span><span class="text-primary">{formatInvoiceCurrency(invoice.totals.total)}</span></div>
			</section>

			<section aria-labelledby="invoice-payment" class="space-y-3">
				<h2 id="invoice-payment" class="text-lg font-bold">Rekening pembayaran</h2>
				{#if invoice.paymentAccounts.length}
					<p class="text-sm leading-6 text-[#4A3B32]/65">Pilih salah satu rekening berikut. Salin nomor rekening untuk memudahkan transfer.</p>
					{#each invoice.paymentAccounts as account (account.id)}
						<div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/10 p-4">
							<div class="min-w-0"><h3 class="font-bold">{account.name}</h3><code class="mt-1 block select-all break-all font-mono text-base">{account.norek}</code></div>
							<button type="button" onclick={() => copyAccount(account)} disabled={!!copying} aria-label={`Salin nomor rekening ${account.name}`} class="invoice-actions inline-flex items-center gap-2 rounded-xl border border-primary/20 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">
								{#if copiedAccount === account.id}<Check class="size-4" />Tersalin{:else}<Copy class="size-4" />{copying === account.id ? 'Menyalin…' : 'Salin'}{/if}
							</button>
						</div>
					{/each}
				{:else}<p class="rounded-xl bg-[#FFFBF7] p-4 text-sm leading-6">Rekening pembayaran belum tersedia. Hubungi admin untuk informasi pembayaran.</p>{/if}
				{#if copiedAccount}<p role="status" class="text-sm text-emerald-700">Nomor rekening berhasil disalin.</p>{/if}
				{#if copyError}<p role="alert" class="text-sm text-red-700">{copyError}</p>{/if}
			</section>

			<footer class="space-y-4 border-t border-primary/10 pt-5">
				{#if invoice.store?.address}<p class="text-sm text-[#4A3B32]/65">{invoice.store.address}</p>{/if}
				<button type="button" onclick={() => window.print()} class="invoice-actions rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white">Cetak / Simpan PDF (A4)</button>
				<div class="invoice-actions flex flex-col gap-3 sm:flex-row">
					{#if whatsappHref}<a href={whatsappHref} target="_blank" rel="noreferrer" class="inline-flex flex-1 justify-center rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white">Hubungi Admin WhatsApp</a>{/if}
					<a href={`/order/receipt/${order.id}`} class="inline-flex flex-1 justify-center rounded-xl border border-primary/20 px-5 py-3 text-sm font-bold text-primary">Lihat pesanan</a>
				</div>
			</footer>
		</div>
	</article>
</div>

<style>
 @media print {
  :global(body *:not(.invoice-print):not(.invoice-print *):not(:has(.invoice-print))) { display: none !important; }
  :global(body *:has(.invoice-print)) { display: block !important; position: static !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; width: auto !important; overflow: visible !important; }
  :global(.invoice-print) { position: static; width: 100%; max-width: none; margin: 0; border: 0; border-radius: 0; box-shadow: none; overflow: visible; }
  :global(.invoice-actions), :global(.invoice-actions *) { display: none !important; }
  :global(.invoice-print section), :global(.invoice-print header) { break-inside: auto; }
  :global(.invoice-print .invoice-item) { break-inside: avoid; }
  :global(.invoice-print) { print-color-adjust: exact; }
 }
 @page { size: A4; margin: 12mm; }
</style>
