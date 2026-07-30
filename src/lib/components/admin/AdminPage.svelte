<script>
	let { children, class: className = '' } = $props();
</script>

<div class={`mx-auto flex w-full max-w-[1600px] flex-col gap-6 ${className}`}>
	{@render children?.()}
</div>
