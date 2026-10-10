<script>
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import LineChart from '@lucide/svelte/icons/line-chart';
	import Truck from '@lucide/svelte/icons/truck';
	import Cake from '@lucide/svelte/icons/cake';
	import ShoppingBag from '@lucide/svelte/icons/shopping-bag';
	import { cn } from '$lib/utils';
	import { normalizeRevenueSeries, calculateRevenueSummary } from '$lib/analytics.js';

	let {
		series = [],
		groupBy = 'day',
		onGroupByChange = () => {}
	} = $props();

	let chartMode = $state('area'); // 'area' | 'bar'
	let hoveredIndex = $state(null);
	let svgWidth = $state(800);
	let svgHeight = $state(280);

	const padding = { top: 24, right: 20, bottom: 36, left: 60 };

	let innerWidth = $derived(Math.max(100, svgWidth - padding.left - padding.right));
	let innerHeight = $derived(Math.max(80, svgHeight - padding.top - padding.bottom));

	let normalizedSeries = $derived(normalizeRevenueSeries(series));
	let summary = $derived(calculateRevenueSummary(series));

	let maxValue = $derived(
		Math.max(
			100_000,
			...normalizedSeries.map((d) => (chartMode === 'bar' ? d.total : Math.max(d.revenue, d.deliveryFee, d.total)))
		)
	);

	// Y-axis scale ticks (4 ticks)
	let yTicks = $derived([
		0,
		Math.round(maxValue * 0.33),
		Math.round(maxValue * 0.66),
		maxValue
	]);

	let labelStep = $derived(Math.max(1, Math.ceil(normalizedSeries.length / 8)));

	function getX(index, totalCount) {
		if (totalCount <= 1) return padding.left + innerWidth / 2;
		return padding.left + (index / (totalCount - 1)) * innerWidth;
	}

	function getY(val) {
		if (maxValue === 0) return padding.top + innerHeight;
		const ratio = Math.min(1, Math.max(0, val / maxValue));
		return padding.top + innerHeight - ratio * innerHeight;
	}

	function formatCurrency(val) {
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(Number(val) || 0);
	}

	function formatCompact(val) {
		if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + 'M';
		if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'jt';
		if (val >= 1_000) return (val / 1_000).toFixed(0) + 'rb';
		return String(val);
	}

	function formatDateLabel(dateStr) {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		if (groupBy === 'month') {
			return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
		}
		return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
	}

	function formatDateFull(dateStr) {
		if (!dateStr) return '-';
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString('id-ID', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	// SVG Path generators for smooth area & line
	function buildLinePath(dataPoints, valueKey) {
		if (dataPoints.length === 0) return '';
		const points = dataPoints.map((d, i) => ({
			x: getX(i, dataPoints.length),
			y: getY(d[valueKey])
		}));

		if (points.length === 1) {
			return `M ${points[0].x} ${points[0].y} L ${points[0].x + 1} ${points[0].y}`;
		}

		let path = `M ${points[0].x} ${points[0].y}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i];
			const p1 = points[i + 1];
			const cpX1 = p0.x + (p1.x - p0.x) / 3;
			const cpX2 = p0.x + ((p1.x - p0.x) * 2) / 3;
			path += ` C ${cpX1} ${p0.y}, ${cpX2} ${p1.y}, ${p1.x} ${p1.y}`;
		}
		return path;
	}

	function buildAreaPath(dataPoints, valueKey) {
		if (dataPoints.length === 0) return '';
		const line = buildLinePath(dataPoints, valueKey);
		const firstX = getX(0, dataPoints.length);
		const lastX = getX(dataPoints.length - 1, dataPoints.length);
		const bottomY = padding.top + innerHeight;
		return `${line} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
	}

	let revenueAreaPath = $derived(buildAreaPath(normalizedSeries, 'revenue'));
	let revenueLinePath = $derived(buildLinePath(normalizedSeries, 'revenue'));

	let deliveryAreaPath = $derived(buildAreaPath(normalizedSeries, 'deliveryFee'));
	let deliveryLinePath = $derived(buildLinePath(normalizedSeries, 'deliveryFee'));

	let totalLinePath = $derived(buildLinePath(normalizedSeries, 'total'));

	let hoveredData = $derived(
		hoveredIndex !== null && normalizedSeries[hoveredIndex] ? normalizedSeries[hoveredIndex] : null
	);
</script>

<div class="rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card">
	<!-- CHART HEADER WITH TITLE AND CONTROLS -->
	<div class="flex flex-wrap items-center justify-between gap-4 border-b border-primary/10 pb-4">
		<div>
			<div class="flex items-center gap-2">
				<div class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
					<TrendingUp class="size-4" />
				</div>
				<h3 class="text-base font-bold text-[#4A3B32] dark:text-foreground">Grafik Pendapatan & Ongkir</h3>
			</div>
			<p class="mt-0.5 text-xs text-[#4A3B32]/70 dark:text-muted-foreground">
				Tren omset produk kue vs ongkos kirim dan volume order harian.
			</p>
		</div>

		<!-- CONTROLS (GROUP BY & CHART TYPE TOGGLE) -->
		<div class="flex flex-wrap items-center gap-2">
			<!-- Group By Selector -->
			<div class="inline-flex rounded-lg bg-muted p-1 text-xs">
				<button
					type="button"
					onclick={() => onGroupByChange('day')}
					class={cn(
						'rounded-md px-2.5 py-1 font-semibold transition-all duration-150 active:scale-[0.97]',
						groupBy === 'day' ? 'bg-background text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
					)}
				>
					Harian
				</button>
				<button
					type="button"
					onclick={() => onGroupByChange('week')}
					class={cn(
						'rounded-md px-2.5 py-1 font-semibold transition-all duration-150 active:scale-[0.97]',
						groupBy === 'week' ? 'bg-background text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
					)}
				>
					Mingguan
				</button>
				<button
					type="button"
					onclick={() => onGroupByChange('month')}
					class={cn(
						'rounded-md px-2.5 py-1 font-semibold transition-all duration-150 active:scale-[0.97]',
						groupBy === 'month' ? 'bg-background text-foreground shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
					)}
				>
					Bulanan
				</button>
			</div>

			<!-- Chart Type Switcher -->
			<div class="inline-flex rounded-lg bg-muted p-1 text-xs">
				<button
					type="button"
					title="Tampilan Grafik Area"
					onclick={() => (chartMode = 'area')}
					class={cn(
						'flex items-center gap-1 rounded-md px-2 py-1 transition-all duration-150 active:scale-[0.97]',
						chartMode === 'area' ? 'bg-background text-primary shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
					)}
				>
					<LineChart class="size-3.5" />
					<span>Area</span>
				</button>
				<button
					type="button"
					title="Tampilan Grafik Batang"
					onclick={() => (chartMode = 'bar')}
					class={cn(
						'flex items-center gap-1 rounded-md px-2 py-1 transition-all duration-150 active:scale-[0.97]',
						chartMode === 'bar' ? 'bg-background text-primary shadow-2xs font-bold' : 'text-muted-foreground hover:text-foreground'
					)}
				>
					<BarChart3 class="size-3.5" />
					<span>Batang</span>
				</button>
			</div>
		</div>
	</div>

	<!-- LEGEND INDICATORS -->
	<div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
		<div class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-1.5">
				<span class="size-2.5 rounded-full bg-[#95724E]"></span>
				<span class="font-medium text-foreground">Omset Kue:</span>
				<strong class="font-bold text-foreground">{formatCurrency(summary.totalRevenue)}</strong>
			</div>

			<div class="flex items-center gap-1.5">
				<span class="size-2.5 rounded-full bg-[#0284C7]"></span>
				<span class="font-medium text-foreground">Ongkir:</span>
				<strong class="font-bold text-foreground">{formatCurrency(summary.totalDelivery)}</strong>
			</div>

			<div class="flex items-center gap-1.5">
				<span class="size-2.5 rounded-full bg-[#10B981]"></span>
				<span class="font-medium text-foreground">Total Bruto:</span>
				<strong class="font-bold text-foreground">{formatCurrency(summary.totalGross)}</strong>
			</div>
		</div>

		<div class="text-[11px] text-muted-foreground font-medium">
			Total {summary.totalOrders} pesanan dalam periode
		</div>
	</div>

	<!-- SVG CHART CONTAINER -->
	<div
		class="relative mt-4 w-full select-none"
		bind:clientWidth={svgWidth}
	>
		{#if normalizedSeries.length === 0}
			<div class="flex h-56 flex-col items-center justify-center rounded-xl bg-muted/20 text-center text-xs text-muted-foreground">
				<TrendingUp class="size-6 text-muted-foreground/50 mb-1.5" />
				<span>Belum ada data transaksi pendapatan pada rentang tanggal ini.</span>
			</div>
		{:else}
			<svg
				width="100%"
				height={svgHeight}
				viewBox={`0 0 ${svgWidth} ${svgHeight}`}
				class="overflow-visible"
			>
				<defs>
					<!-- Linear gradients -->
					<linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#95724E" stop-opacity="0.35" />
						<stop offset="100%" stop-color="#95724E" stop-opacity="0.0" />
					</linearGradient>

					<linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="#0284C7" stop-opacity="0.25" />
						<stop offset="100%" stop-color="#0284C7" stop-opacity="0.0" />
					</linearGradient>
				</defs>

				<!-- Y-AXIS GRID LINES & LABELS -->
				{#each yTicks as tickVal}
					{@const yPos = getY(tickVal)}
					<g class="transition-all duration-150">
						<line
							x1={padding.left}
							y1={yPos}
							x2={padding.left + innerWidth}
							y2={yPos}
							stroke="currentColor"
							stroke-dasharray="4 4"
							class="text-border/60"
						/>
						<text
							x={padding.left - 8}
							y={yPos + 4}
							text-anchor="end"
							class="fill-muted-foreground text-[10px] font-mono font-medium"
						>
							{formatCompact(tickVal)}
						</text>
					</g>
				{/each}

				<!-- AREA CHART RENDERING -->
				{#if chartMode === 'area'}
					<!-- Delivery Area & Line -->
					<path d={deliveryAreaPath} fill="url(#deliveryGradient)" />
					<path
						d={deliveryLinePath}
						fill="none"
						stroke="#0284C7"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>

					<!-- Revenue Area & Line -->
					<path d={revenueAreaPath} fill="url(#revenueGradient)" />
					<path
						d={revenueLinePath}
						fill="none"
						stroke="#95724E"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>

					<!-- Total Trend Dash Line -->
					<path
						d={totalLinePath}
						fill="none"
						stroke="#10B981"
						stroke-width="1.5"
						stroke-dasharray="3 3"
						stroke-linecap="round"
					/>
				{:else}
					<!-- BAR CHART RENDERING -->
					{@const barWidth = Math.max(8, Math.min(36, (innerWidth / normalizedSeries.length) * 0.65))}
					{#each normalizedSeries as d, i}
						{@const xCenter = getX(i, normalizedSeries.length)}
						{@const xBar = xCenter - barWidth / 2}
						{@const revH = (d.revenue / maxValue) * innerHeight}
						{@const delH = (d.deliveryFee / maxValue) * innerHeight}
						{@const revY = padding.top + innerHeight - revH}
						{@const delY = revY - delH}

						<g class="transition-opacity duration-150 hover:opacity-90">
							<!-- Revenue (Kue) Bar (Bottom) -->
							<rect
								x={xBar}
								y={revY}
								width={barWidth}
								height={Math.max(0, revH)}
								fill="#95724E"
								rx={delH > 0 ? 0 : 3}
								class="transition-[height,y] duration-150"
							/>
							<!-- Delivery Fee Bar (Stacked on top) -->
							{#if delH > 0}
								<rect
									x={xBar}
									y={delY}
									width={barWidth}
									height={Math.max(0, delH)}
									fill="#0284C7"
									rx="3"
									class="transition-[height,y] duration-150"
								/>
							{/if}
						</g>
					{/each}
				{/if}

				<!-- X-AXIS LABELS & HOVER HITBOXES -->
				{#each normalizedSeries as d, i}
					{@const xPos = getX(i, normalizedSeries.length)}
					{@const showLabel = i % labelStep === 0 || i === normalizedSeries.length - 1}

					{#if showLabel}
						<text
							x={xPos}
							y={padding.top + innerHeight + 18}
							text-anchor="middle"
							class="fill-muted-foreground text-[10px] font-medium"
						>
							{formatDateLabel(d.date)}
						</text>
					{/if}

					<!-- HOVER COLUMN TRIGGER -->
					<rect
						x={xPos - innerWidth / normalizedSeries.length / 2}
						y={padding.top}
						width={innerWidth / normalizedSeries.length}
						height={innerHeight}
						fill="transparent"
						class="cursor-pointer outline-none"
						tabindex="-1"
						aria-hidden="true"
						onmouseenter={() => (hoveredIndex = i)}
						onmouseleave={() => (hoveredIndex = null)}
					/>

					<!-- ACTIVE HOVER POINT INDICATOR -->
					{#if hoveredIndex === i}
						<line
							x1={xPos}
							y1={padding.top}
							x2={xPos}
							y2={padding.top + innerHeight}
							stroke="#95724E"
							stroke-width="1.5"
							stroke-dasharray="2 2"
							class="pointer-events-none"
						/>
						<circle
							cx={xPos}
							cy={getY(d.revenue)}
							r="4.5"
							fill="#95724E"
							stroke="#FFFFFF"
							stroke-width="2"
							class="pointer-events-none drop-shadow-xs"
						/>
						{#if d.deliveryFee > 0}
							<circle
								cx={xPos}
								cy={getY(d.deliveryFee)}
								r="3.5"
								fill="#0284C7"
								stroke="#FFFFFF"
								stroke-width="1.5"
								class="pointer-events-none drop-shadow-xs"
							/>
						{/if}
					{/if}
				{/each}
			</svg>

			<!-- TACTILE POPUP TOOLTIP -->
			{#if hoveredData !== null}
				{@const hoverX = getX(hoveredData.index, normalizedSeries.length)}
				{@const isRightSide = hoverX > svgWidth * 0.65}
				<div
					class={cn(
						'pointer-events-none absolute top-2 z-20 w-64 rounded-xl border border-border/80 bg-background/95 p-3 shadow-xl backdrop-blur transition-all duration-100 ease-out',
						isRightSide ? 'right-auto' : 'left-auto'
					)}
					style={`left: ${isRightSide ? hoverX - 264 : hoverX + 16}px; top: 12px;`}
				>
					<div class="border-b border-border/50 pb-1.5">
						<div class="text-[11px] font-bold text-foreground">
							{formatDateFull(hoveredData.date)}
						</div>
						<div class="flex items-center gap-1 text-[10px] text-muted-foreground">
							<ShoppingBag class="size-3 text-primary" />
							<span>{hoveredData.orderCount} pesanan selesai</span>
						</div>
					</div>

					<div class="mt-2 space-y-1 text-xs">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<span class="size-2 rounded-full bg-[#95724E]"></span>
								<span>Omset Kue:</span>
							</div>
							<strong class="font-bold text-foreground">{formatCurrency(hoveredData.revenue)}</strong>
						</div>

						<div class="flex items-center justify-between">
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<span class="size-2 rounded-full bg-[#0284C7]"></span>
								<span>Ongkos Kirim:</span>
							</div>
							<strong class="font-bold text-foreground">{formatCurrency(hoveredData.deliveryFee)}</strong>
						</div>

						<div class="flex items-center justify-between border-t border-border/40 pt-1">
							<div class="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
								<span class="size-2 rounded-full bg-emerald-500"></span>
								<span>Total Bruto:</span>
							</div>
							<strong class="font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(hoveredData.total)}</strong>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
