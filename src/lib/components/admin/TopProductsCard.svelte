<script>
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import Cake from '@lucide/svelte/icons/cake';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import { cn } from '$lib/utils';

	let {
		products = []
	} = $props();

	function formatCurrency(amount) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(Number(amount) || 0);
	}
</script>

<div class="flex flex-col justify-between rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card">
	<!-- HEADER -->
	<div class="flex items-center justify-between gap-3 border-b border-primary/10 pb-3.5">
		<div class="flex items-center gap-2.5">
			<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<ShoppingBag class="size-4" />
			</div>
			<div>
				<h3 class="text-sm font-bold text-[#4A3B32] dark:text-foreground sm:text-base">Produk Terlaris</h3>
				<p class="text-[11px] text-muted-foreground">Peringkat penjualan pada periode terpilih</p>
			</div>
		</div>

		<a
			href="/admin/dashboard/products"
			class="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
		>
			<span>Katalog</span>
			<ArrowUpRight class="size-3.5" />
		</a>
	</div>

	<!-- BODY LIST -->
	<div class="mt-3.5 flex-1 divide-y divide-border/40">
		{#if products.length === 0}
			<div class="flex h-48 flex-col items-center justify-center text-center text-xs text-muted-foreground">
				<Cake class="mb-2 size-6 text-muted-foreground/40" />
				<span>Belum ada data penjualan produk pada rentang tanggal ini.</span>
			</div>
		{:else}
			<div class="space-y-3">
				{#each products as item}
					<div class="group relative flex items-center justify-between gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted/30">
						<div class="flex min-w-0 items-center gap-3">
							<!-- Clean Monospaced Rank Number -->
							<span class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 font-mono text-xs font-bold text-[#4A3B32]/70 dark:text-foreground/70">
								{item.rankFormatted}
							</span>

							<!-- Thumbnail -->
							<div class="relative size-10 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-muted/40">
								{#if item.imageUrl}
									<img
										src={item.imageUrl}
										alt={item.productName}
										class="size-full object-cover transition-transform duration-200 group-hover:scale-105"
										loading="lazy"
										onerror={(e) => {
											e.currentTarget.style.display = 'none';
											if (e.currentTarget.nextElementSibling) {
												e.currentTarget.nextElementSibling.style.display = 'flex';
											}
										}}
									/>
									<div class="hidden size-full items-center justify-center text-muted-foreground/60">
										<Cake class="size-4" />
									</div>
								{:else}
									<div class="flex size-full items-center justify-center text-muted-foreground/60">
										<Cake class="size-4" />
									</div>
								{/if}
							</div>

							<!-- Title & Units -->
							<div class="min-w-0">
								<h4 class="truncate text-xs font-bold text-[#4A3B32] dark:text-foreground sm:text-sm">
									{item.productName}
								</h4>
								<div class="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
									<span class="font-medium text-foreground">{item.totalSold} terjual</span>
								</div>
							</div>
						</div>

						<!-- Revenue & Progress Bar -->
						<div class="shrink-0 text-right">
							<div class="text-xs font-bold text-[#4A3B32] dark:text-foreground sm:text-sm">
								{formatCurrency(item.totalRevenue)}
							</div>
							<!-- Relative Share Bar -->
							<div class="mt-1 h-1 w-20 overflow-hidden rounded-full bg-primary/10 ml-auto sm:w-24">
								<div
									class="h-full rounded-full bg-primary transition-all duration-300"
									style={`width: ${item.percentageOfMax}%;`}
								></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
