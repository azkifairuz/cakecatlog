<script>
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { path = '/admin/dashboard' } = $props();

	let kind = $derived(
		path === '/admin/dashboard'
			? 'dashboard'
			: path.startsWith('/admin/dashboard/site-info') || path.startsWith('/admin/dashboard/whatsapp')
				? 'form'
				: 'list'
	);

	const skeletonClass = 'motion-reduce:animate-none';
</script>

<div class="flex min-h-[50vh] flex-col gap-6" aria-hidden="true">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<Skeleton class={`h-3 w-24 ${skeletonClass}`} />
			<Skeleton class={`h-8 w-full max-w-xs ${skeletonClass}`} />
			<Skeleton class={`h-4 w-full max-w-lg ${skeletonClass}`} />
		</div>
		<Skeleton class={`h-10 w-32 ${skeletonClass}`} />
	</div>

	{#if kind === 'dashboard'}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
			{#each Array(5) as _}
				<div class="flex flex-col gap-3 rounded-2xl border bg-card p-5">
					<Skeleton class={`h-4 w-24 ${skeletonClass}`} />
					<Skeleton class={`h-8 w-32 ${skeletonClass}`} />
					<Skeleton class={`h-3 w-full ${skeletonClass}`} />
				</div>
			{/each}
		</div>
		<div class="flex flex-col gap-4 rounded-2xl border bg-card p-5">
			<Skeleton class={`h-10 w-full ${skeletonClass}`} />
			{#each Array(5) as _}
				<div class="flex items-center gap-4">
					<Skeleton class={`size-10 shrink-0 rounded-lg ${skeletonClass}`} />
					<div class="flex flex-1 flex-col gap-2">
						<Skeleton class={`h-4 w-2/5 ${skeletonClass}`} />
						<Skeleton class={`h-3 w-3/5 ${skeletonClass}`} />
					</div>
					<Skeleton class={`h-8 w-20 ${skeletonClass}`} />
				</div>
			{/each}
		</div>
	{:else if kind === 'form'}
		<div class="flex max-w-3xl flex-col gap-5 rounded-2xl border bg-card p-5 sm:p-6">
			{#each Array(4) as _, index}
				<div class="flex flex-col gap-2">
					<Skeleton class={`h-4 ${index === 0 ? 'w-28' : 'w-36'} ${skeletonClass}`} />
					<Skeleton class={`${index === 2 ? 'h-28' : 'h-10'} w-full ${skeletonClass}`} />
				</div>
			{/each}
			<Skeleton class={`h-10 w-36 ${skeletonClass}`} />
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			<Skeleton class={`h-12 w-full rounded-xl ${skeletonClass}`} />
			<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{#each Array(6) as _}
					<div class="flex flex-col gap-4 rounded-2xl border bg-card p-5">
						<div class="flex items-center justify-between gap-3">
							<Skeleton class={`h-5 w-2/5 ${skeletonClass}`} />
							<Skeleton class={`h-6 w-16 rounded-full ${skeletonClass}`} />
						</div>
						<Skeleton class={`h-4 w-4/5 ${skeletonClass}`} />
						<Skeleton class={`h-20 w-full ${skeletonClass}`} />
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
