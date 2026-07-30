<script>
	import * as InputGroup from '$lib/components/ui/input-group';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	let { value = $bindable(''), placeholder = 'Cari...', label = 'Cari', name, id } = $props();
</script>

<InputGroup.Root class="h-10 rounded-lg bg-background">
	<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
	<InputGroup.Input bind:value {placeholder} {name} {id} type="search" aria-label={label} />
	{#if value}
		<InputGroup.Addon align="inline-end">
			<InputGroup.Button size="icon-xs" onclick={() => (value = '')} aria-label="Hapus pencarian"><XIcon /></InputGroup.Button>
		</InputGroup.Addon>
	{/if}
</InputGroup.Root>
