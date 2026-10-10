<script>
	import PieChart from '@lucide/svelte/icons/pie-chart';
	import Filter from '@lucide/svelte/icons/filter';
	import { cn } from '$lib/utils';

	let {
		breakdown = [],
		onStatusSelect = () => {}
	} = $props();

	let totalOrders = $derived(
		breakdown.reduce((sum, item) => sum + Number(item.count || 0), 0)
	);
</script>

<div class="flex flex-col justify-between rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card">
	<!-- HEADER -->
	<div class="flex items-center justify-between gap-3 border-b border-primary/10 pb-3.5">
		<div class="flex items-center gap-2.5">
			<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
				<PieChart class="size-4" />
			</div>
			<div>
				<h3 class="text-sm font-bold text-[#4A3B32] dark:text-foreground sm:text-base">Distribusi Status Pesanan</h3>
				<p class="text-[11px] text-muted-foreground">Komposisi pesanan pada periode terpilih</p>
			</div>
		</div>

		<div class="rounded-full bg-muted/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
			{totalOrders} Total Pesanan
		</div>
	</div>

	<!-- BODY -->
	<div class="mt-3.5 flex-1 space-y-4">
		{#if breakdown.length === 0 || totalOrders === 0}
			<div class="flex h-48 flex-col items-center justify-center text-center text-xs text-muted-foreground">
				<PieChart class="mb-2 size-6 text-muted-foreground/40" />
				<span>Belum ada data pesanan pada rentang tanggal ini.</span>
			</div>
		{:else}
			<!-- MULTI-SEGMENT STACKED PROGRESS BAR -->
			<div class="h-3 w-full overflow-hidden rounded-full bg-muted/40 p-0.5 flex gap-0.5 shadow-inner">
				{#each breakdown as item}
					{#if item.percentage > 0}
						<div
							class={cn('h-full rounded-full transition-all duration-300', item.bgClass)}
							style={`width: ${Math.max(2, item.percentage)}%;`}
							title={`${item.label}: ${item.count} pesanan (${item.percentage}%)`}
						></div>
					{/if}
				{/each}
			</div>

			<!-- STATUS ITEMS GRID -->
			<div class="grid grid-cols-2 gap-2.5 sm:gap-3">
				{#each breakdown as item}
					<button
						type="button"
						onclick={() => onStatusSelect(item.status || item.label)}
						class={cn(
							'group flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all duration-150 hover:shadow-xs active:scale-[0.98] cursor-pointer',
							item.badgeBgClass,
							item.borderClass
						)}
					>
						<div class="flex items-center justify-between gap-1.5">
							<div class="flex items-center gap-1.5 min-w-0">
								<span class={cn('size-2 shrink-0 rounded-full', item.bgClass)}></span>
								<span class="truncate text-xs font-bold text-foreground">{item.label}</span>
							</div>
							<span class="text-[10px] font-bold font-mono text-muted-foreground">
								{item.percentage}%
							</span>
						</div>

						<div class="mt-2 flex items-center justify-between text-xs">
							<span class="font-bold text-foreground sm:text-sm">
								{item.count} <span class="text-[11px] font-normal text-muted-foreground">order</span>
							</span>
							<span class="text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
								Filter &rarr;
							</span>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
