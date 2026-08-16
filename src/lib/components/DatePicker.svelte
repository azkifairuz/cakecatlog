<script>
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import XIcon from '@lucide/svelte/icons/x';
	import { DateFormatter, getLocalTimeZone, parseDate } from "@internationalized/date";
	import { cn } from "$lib/utils.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Calendar } from "$lib/components/ui/calendar/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";

	let {
		value = $bindable(),
		placeholder = "Pilih tanggal",
		class: className,
		onValueChange,
		clearable = false,
		clearLabel = "Tampilkan semua tanggal"
	} = $props();
    
    // value is expected to be a string "YYYY-MM-DD"
    let dateValue = $state();
	let open = $state(false);
	
	$effect(() => {
		if (value) {
			try {
				dateValue = parseDate(value);
			} catch (e) {
				dateValue = undefined;
			}
		} else {
			dateValue = undefined;
		}
	});

    function handleDateChange(newDateValue) {
		dateValue = newDateValue;
		if (newDateValue) {
			value = newDateValue.toString();
		} else {
			value = "";
		}
		onValueChange?.(value);
	}

	function clearDate() {
		handleDateChange(undefined);
		open = false;
	}

	const df = new DateFormatter("id-ID", {
		dateStyle: "medium"
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				variant="outline"
				class={cn(
					"justify-start text-left font-normal border-primary/20 bg-slate-50 hover:bg-slate-100 focus:border-primary",
					!value && "text-slate-500",
					className
				)}
				{...props}
			>
				<CalendarIcon class="mr-2 h-4 w-4 text-primary/70" />
				{dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : placeholder}
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-auto p-0" align="start">
		<Calendar value={dateValue} onValueChange={handleDateChange} />
		{#if clearable && value}
			<Separator />
			<div class="p-2">
				<Button type="button" variant="ghost" size="sm" class="w-full" onclick={clearDate}>
					<XIcon data-icon="inline-start" />
					{clearLabel}
				</Button>
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
