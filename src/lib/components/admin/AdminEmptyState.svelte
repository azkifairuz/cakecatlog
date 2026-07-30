<script>
	import * as Empty from '$lib/components/ui/empty';
	import InboxIcon from '@lucide/svelte/icons/inbox';

	let { title, description = '', action, icon: Icon = InboxIcon } = $props();
</script>

<Empty.Root class="min-h-48 border border-border bg-card p-8">
	<Empty.Header>
		<Empty.Media variant="icon"><Icon /></Empty.Media>
		<Empty.Title>{title}</Empty.Title>
		{#if description}<Empty.Description>{description}</Empty.Description>{/if}
	</Empty.Header>
	{#if action}<Empty.Content>{@render action()}</Empty.Content>{/if}
</Empty.Root>
