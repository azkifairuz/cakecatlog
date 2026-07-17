<script>
	import { cn } from '$lib/utils.js';

	let {
		label = 'Loading...',
		description = '',
		variant = 'inline',
		size = 'md',
		class: className = ''
	} = $props();

	const spinnerSize = {
		sm: 'size-4 border-2',
		md: 'size-6 border-2',
		lg: 'size-8 border-[3px]'
	};
</script>

{#if variant === 'overlay'}
	<div
		class={cn(
			'absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-white/80 p-4 text-slate-700 backdrop-blur-sm',
			className
		)}
		role="status"
		aria-live="polite"
		aria-label={label}
	>
		<div class="flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-lg">
			<div
				class={cn(
					'animate-spin rounded-full border-slate-200 border-t-primary',
					spinnerSize[size] ?? spinnerSize.md
				)}
			></div>
			<div class="space-y-1">
				<p class="text-sm font-semibold text-slate-800">{label}</p>
				{#if description}
					<p class="text-xs leading-relaxed text-slate-500">{description}</p>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<span class={cn('inline-flex items-center gap-2', className)} role="status" aria-live="polite">
		<span
			class={cn(
				'animate-spin rounded-full border-current/25 border-t-current',
				spinnerSize[size] ?? spinnerSize.md
			)}
			aria-hidden="true"
		></span>
		{#if label}
			<span>{label}</span>
		{/if}
	</span>
{/if}
