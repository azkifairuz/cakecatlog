<script>
	import Bell from '@lucide/svelte/icons/bell';
	import { NOTIFICATIONS_URL } from '$lib/admin-notifications.js';

	let { count = 0 } = $props();
</script>

<a
	href={NOTIFICATIONS_URL}
	class="relative inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none"
	aria-label={count > 0 ? `Notifikasi, ${count} belum dibaca` : 'Notifikasi'}
>
	<Bell class="size-5" />
	{#if count > 0}
		<span class="absolute -right-1 -top-1 flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground" aria-hidden="true">
			{count > 99 ? '99+' : count}
		</span>
	{/if}
</a>
