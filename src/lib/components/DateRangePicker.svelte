<script>
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import XIcon from '@lucide/svelte/icons/x';
	import { DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date";
	import { cn } from "$lib/utils.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { RangeCalendar } from "$lib/components/ui/range-calendar/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";

	let {
		startValue = $bindable(),
		endValue = $bindable(),
		placeholder = "Pilih rentang tanggal",
		class: className,
		onValueChange,
		clearable = true,
		clearLabel = "Reset Filter"
	} = $props();

	let rangeValue = $state({ 
		start: startValue ? parseDate(startValue) : undefined, 
		end: endValue ? parseDate(endValue) : undefined 
	});
	let open = $state(false);
	
	// Responsive logic untuk kalender
	let innerWidth = $state(0);
	let monthsToShow = $derived(innerWidth > 0 && innerWidth < 640 ? 1 : 2);

	let lastPropStart = $state(startValue);
	let lastPropEnd = $state(endValue);

	// Sync dari luar ke dalam: HANYA jika nilai prop benar-benar berubah dari luar (misal tombol reset ditekan)
	$effect(() => {
		if (startValue !== lastPropStart || endValue !== lastPropEnd) {
			lastPropStart = startValue;
			lastPropEnd = endValue;
			
			let newStart = undefined;
			let newEnd = undefined;
			try { if (startValue) newStart = parseDate(startValue); } catch(e) {}
			try { if (endValue) newEnd = parseDate(endValue); } catch(e) {}
			
			rangeValue = { start: newStart, end: newEnd };
		}
	});

	// Sync dari dalam (kalender) ke luar
	$effect(() => {
		if (!rangeValue) return;
		
		// Hanya jalankan sinkronisasi ke parent jika KEDUA tanggal (start & end) sudah dipilih.
		if (rangeValue.start && rangeValue.end) {
			const newStartStr = rangeValue.start.toString();
			const newEndStr = rangeValue.end.toString();
			
			let changed = false;
			if (startValue !== newStartStr) {
				startValue = newStartStr;
				lastPropStart = newStartStr; // Update tracker agar tidak memicu reset
				changed = true;
			}
			if (endValue !== newEndStr) {
				endValue = newEndStr;
				lastPropEnd = newEndStr; // Update tracker agar tidak memicu reset
				changed = true;
			}
			
			if (changed && onValueChange) {
				// Untrack agar tidak memicu effect berulang kali dari pemanggilan fungsi eksternal
				import("svelte").then(({ untrack }) => {
					untrack(() => {
						onValueChange({ start: newStartStr, end: newEndStr });
					});
				});
				open = false; // Auto-close popover setelah range lengkap dipilih
			}
		}
	});

	function clearDate() {
		rangeValue = { start: undefined, end: undefined };
		startValue = "";
		endValue = "";
		lastPropStart = "";
		lastPropEnd = "";
		if (onValueChange) onValueChange({ start: "", end: "" });
		open = false;
	}

	const df = new DateFormatter("id-ID", {
		dateStyle: "medium"
	});
</script>

<svelte:window bind:innerWidth />

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="outline"
				class={cn(
					"justify-start text-left font-normal border-primary/20 bg-slate-50 hover:bg-slate-100 focus:border-primary",
					!startValue && "text-slate-500",
					className
				)}
				{...props}
			>
				<CalendarIcon class="mr-2 h-4 w-4 text-primary/70" />
				{#if rangeValue?.start}
					{#if rangeValue?.end}
						{df.format(rangeValue.start.toDate(getLocalTimeZone()))} - {df.format(rangeValue.end.toDate(getLocalTimeZone()))}
					{:else}
						{df.format(rangeValue.start.toDate(getLocalTimeZone()))}
					{/if}
				{:else}
					{placeholder}
				{/if}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0 max-w-[100vw] sm:max-w-none" align="start">
		<RangeCalendar bind:value={rangeValue} numberOfMonths={monthsToShow} />
		{#if clearable && (startValue || endValue)}
			<Separator />
			<div class="p-2">
				<Button type="button" variant="ghost" size="sm" class="w-full" onclick={clearDate}>
					<XIcon data-icon="inline-start" class="mr-2 h-4 w-4" />
					{clearLabel}
				</Button>
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
