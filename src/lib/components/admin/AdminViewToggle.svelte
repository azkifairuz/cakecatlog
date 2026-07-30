<script>
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import Grid2X2Icon from '@lucide/svelte/icons/grid-2x2';
	import ListIcon from '@lucide/svelte/icons/list';

	let { value = $bindable('card') } = $props();
</script>

<ToggleGroup.Root type="single" bind:value variant="outline" size="sm" class="rounded-lg bg-muted p-1" aria-label="Pilihan tampilan">
	<ToggleGroup.Item value="card" class="h-8 min-w-20 border-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm" aria-label="Tampilan card">
		<Grid2X2Icon data-icon="inline-start" /> Card
	</ToggleGroup.Item>
	<ToggleGroup.Item value="list" class="h-8 min-w-20 border-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm" aria-label="Tampilan list">
		<ListIcon data-icon="inline-start" /> List
	</ToggleGroup.Item>
</ToggleGroup.Root>
