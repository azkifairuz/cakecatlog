<script>
	import CategorySkeleton from '$lib/components/CategorySkeleton.svelte';
</script>

<section id="catalog" class="py-24 bg-white" aria-busy="true" aria-label="Loading catalog">
	<div class="container mx-auto px-6 text-center mb-16">
		<div class="mx-auto mb-8 h-9 w-40 rounded-full bg-slate-100 animate-pulse"></div>
		<CategorySkeleton />
	</div>

	<div class="container mx-auto px-4 sm:px-6 max-w-7xl">
		<div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-12">
			{#each Array(8) as _}
				<div class="bg-white rounded-3xl p-3 sm:p-4 border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col h-full">
					<div class="aspect-square w-full rounded-[1.25rem] bg-[#FFFBF7] mb-3 sm:mb-5 p-1.5 sm:p-2">
						<div class="h-full w-full rounded-[1rem] sm:rounded-xl bg-slate-100 animate-pulse"></div>
					</div>

					<div class="px-1 sm:px-2 flex flex-col flex-1">
						<div class="mb-2 h-4 w-3/4 rounded-full bg-slate-100 animate-pulse"></div>
						<div class="mb-2 hidden h-3 w-full rounded-full bg-slate-100 animate-pulse sm:block"></div>
						<div class="mb-6 hidden h-3 w-2/3 rounded-full bg-slate-100 animate-pulse sm:block"></div>

						<div class="mt-auto flex items-center justify-between">
							<div class="flex flex-col gap-2">
								<div class="h-2.5 w-16 rounded-full bg-slate-100 animate-pulse"></div>
								<div class="h-4 w-20 rounded-full bg-slate-100 animate-pulse"></div>
							</div>
							<div class="h-8 w-8 rounded-full bg-primary/10 animate-pulse sm:h-10 sm:w-10"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
