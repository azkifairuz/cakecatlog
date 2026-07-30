<script>
	let { title, description = '', eyebrow = '', actions } = $props();
</script>

<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
	<div class="min-w-0">
		{#if eyebrow}<p class="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>{/if}
		<h1 class="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
		{#if description}<p class="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>{/if}
	</div>
	{#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>{/if}
</header>
