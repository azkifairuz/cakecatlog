<script>
	let { count = 6 } = $props();
</script>

<div class="relative -mx-6 sm:mx-0" aria-hidden="true">
	<div class="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none sm:hidden"></div>
	<div class="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none sm:hidden"></div>

	<div class="flex overflow-x-auto gap-3 pb-2 px-6 sm:px-0 sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
		{#each Array(count) as _, index}
			<div
				class="h-9 shrink-0 rounded-full bg-slate-100 animate-pulse {index === 0 ? 'w-24' : index % 2 === 0 ? 'w-28' : 'w-32'}"
			></div>
		{/each}
	</div>
</div>
