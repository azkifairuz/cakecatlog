<script>
	import Users from '@lucide/svelte/icons/users';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import { cn } from '$lib/utils';

	let {
		data = { repeatCustomers: 0, repeatOrders: 0, repeatOrderRate: 0, totalOrders: 0, customers: [] }
	} = $props();

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return dateStr;
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function cleanWaNumber(phone) {
		if (!phone) return '';
		let cleaned = String(phone).replace(/\D/g, '');
		if (cleaned.startsWith('0')) {
			cleaned = '62' + cleaned.slice(1);
		}
		return cleaned;
	}

	function getInitial(name) {
		if (!name) return 'P';
		return name.trim().charAt(0).toUpperCase();
	}
</script>

<div class="flex flex-col justify-between rounded-2xl border border-primary/15 bg-white p-4 shadow-sm sm:p-5 dark:bg-card">
	<!-- HEADER -->
	<div class="flex items-center justify-between gap-3 border-b border-primary/10 pb-3.5">
		<div class="flex items-center gap-2.5">
			<div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
				<Users class="size-4" />
			</div>
			<div>
				<h3 class="text-sm font-bold text-[#4A3B32] dark:text-foreground sm:text-base">Pelanggan Setia (Repeat)</h3>
				<p class="text-[11px] text-muted-foreground">Pelanggan dengan pemesanan berulang</p>
			</div>
		</div>

		{#if (data?.repeatCustomers || data?.customers?.length) > 0}
			<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
				{data.repeatCustomers || data.customers.length} Pelanggan
			</span>
		{/if}
	</div>

	<!-- BODY LIST -->
	<div class="mt-3.5 flex-1 divide-y divide-border/40">
		{#if !data.customers || data.customers.length === 0}
			<div class="flex h-48 flex-col items-center justify-center text-center text-xs text-muted-foreground">
				<Users class="mb-2 size-6 text-muted-foreground/40" />
				<span>Belum ada data pelanggan repeat order pada periode ini.</span>
			</div>
		{:else}
			<div class="space-y-3">
				{#each data.customers as customer}
					{@const waNum = cleanWaNumber(customer.phoneNumber)}
					<div class="group relative flex items-center justify-between gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted/30">
						<div class="flex min-w-0 items-center gap-3">
							<!-- Initial Avatar -->
							<div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
								{getInitial(customer.customerName)}
							</div>

							<!-- Customer Info -->
							<div class="min-w-0">
								<div class="flex items-center gap-1.5">
									<h4 class="truncate text-xs font-bold text-[#4A3B32] dark:text-foreground sm:text-sm">
										{customer.customerName}
									</h4>
									<span class="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
										{customer.totalOrders}x Order
									</span>
								</div>

								<div class="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
									{#if customer.orderCountInRange > 0}
										<span>{customer.orderCountInRange}x pada periode ini</span>
										<span>•</span>
									{/if}
									{#if customer.lastOrderNumber}
										<span>Terakhir #{customer.lastOrderNumber} ({formatDate(customer.lastOrderAt)})</span>
									{:else if customer.lastOrderAt}
										<span>Terakhir {formatDate(customer.lastOrderAt)}</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Quick WhatsApp Action -->
						{#if waNum}
							<a
								href={`https://wa.me/${waNum}`}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-emerald-600 shadow-2xs transition-all hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 dark:hover:bg-emerald-950/40"
								title={`Chat WhatsApp ${customer.customerName}`}
							>
								<MessageCircle class="size-4" />
							</a>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
