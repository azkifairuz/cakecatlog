<section class="py-16 md:py-24 bg-[#FFFBF7] relative overflow-hidden" aria-busy="true" aria-label="Loading top picks">
	<div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
		<div class="flex items-end justify-between mb-10">
			<div>
				<div class="mb-3 h-3 w-24 rounded-full bg-primary/10 animate-pulse"></div>
				<div class="h-9 w-48 rounded-full bg-white animate-pulse"></div>
			</div>
			<div class="hidden sm:flex items-center gap-3">
				<div class="h-10 w-10 rounded-full bg-white animate-pulse"></div>
				<div class="h-10 w-10 rounded-full bg-white animate-pulse"></div>
			</div>
		</div>

		<div class="overflow-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
			<div class="flex gap-4 sm:gap-6">
				{#each Array(5) as _}
					<div class="flex-[0_0_60%] sm:flex-[0_0_40%] md:flex-[0_0_30%] lg:flex-[0_0_22%] min-w-0">
						<div class="bg-white rounded-[2rem] p-3 sm:p-4 border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col h-full">
							<div class="aspect-square w-full rounded-[1.5rem] bg-[#FFFBF7] mb-3 sm:mb-5 p-2">
								<div class="h-full w-full rounded-xl bg-slate-100 animate-pulse"></div>
							</div>
							<div class="px-2 flex flex-col flex-1">
								<div class="mb-2 h-4 w-3/4 rounded-full bg-slate-100 animate-pulse"></div>
								<div class="mb-2 h-3 w-full rounded-full bg-slate-100 animate-pulse"></div>
								<div class="mb-6 h-3 w-2/3 rounded-full bg-slate-100 animate-pulse"></div>
								<div class="mt-auto flex items-center justify-between">
									<div class="flex flex-col gap-2">
										<div class="h-2.5 w-16 rounded-full bg-slate-100 animate-pulse"></div>
										<div class="h-4 w-20 rounded-full bg-slate-100 animate-pulse"></div>
									</div>
									<div class="h-8 w-8 rounded-full bg-primary/10 animate-pulse sm:h-10 sm:w-10"></div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
