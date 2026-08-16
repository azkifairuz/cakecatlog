<script>
	import * as InputGroup from '$lib/components/ui/input-group';
	import { cn } from '$lib/utils.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	let { value = $bindable(''), placeholder = 'Cari...', label = 'Cari', name, id, onValueChange, class: className } = $props();
</script>

<InputGroup.Root class={cn('h-10 rounded-lg bg-background', className)}>
	<InputGroup.Addon><SearchIcon /></InputGroup.Addon>
	<InputGroup.Input bind:value {placeholder} {name} {id} type="search" aria-label={label} oninput={(event) => onValueChange?.(event.currentTarget.value)} />
	{#if value}
		<InputGroup.Addon align="inline-end">
		<InputGroup.Button size="icon-xs" onclick={() => { value = ''; onValueChange?.(''); }} aria-label="Hapus pencarian"><XIcon /></InputGroup.Button>
		</InputGroup.Addon>
	{/if}
</InputGroup.Root>
