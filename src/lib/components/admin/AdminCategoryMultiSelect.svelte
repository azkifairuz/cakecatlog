<script>
	import { Button } from '$lib/components/ui/button';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';

	let {
		options = [],
		value = $bindable([]),
		name,
		id,
		placeholder = 'Semua kategori',
		searchPlaceholder = 'Cari kategori...'
	} = $props();

	let open = $state(false);
	let selectedLabels = $derived(
		options.filter((option) => value.includes(option.value)).map((option) => option.label)
	);
	let triggerLabel = $derived(
		selectedLabels.length === 0
			? placeholder
			: selectedLabels.length === 1
				? selectedLabels[0]
				: `${selectedLabels.length} kategori dipilih`
	);

	function toggleOption(optionValue) {
		value = value.includes(optionValue)
			? value.filter((item) => item !== optionValue)
			: [...value, optionValue];
	}
</script>

{#if name}
	{#each value as selectedValue (selectedValue)}
		<input type="hidden" {name} value={selectedValue} />
	{/each}
{/if}

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				{id}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				aria-haspopup="listbox"
				class="w-full justify-between font-normal"
			>
				<span class="truncate">{triggerLabel}</span>
				<ChevronsUpDownIcon data-icon="inline-end" class="opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content align="start" class="w-(--bits-popover-anchor-width) p-0">
		<Command.Root>
			<Command.Input placeholder={searchPlaceholder} />
			<Command.List>
				<Command.Empty>Kategori tidak ditemukan.</Command.Empty>
				<Command.Group heading="Filter kategori">
					<Command.Item
						value="semua kategori"
						data-checked={value.length === 0}
						onSelect={() => (value = [])}
					>
						Semua kategori
					</Command.Item>
					{#each options as option (option.value)}
						<Command.Item
							value={`${option.label} ${option.value}`}
							data-checked={value.includes(option.value)}
							onSelect={() => toggleOption(option.value)}
						>
							<span class="truncate">{option.label}</span>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
