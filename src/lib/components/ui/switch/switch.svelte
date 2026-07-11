<script>
	let {
		id = undefined,
		name = undefined,
		checked = $bindable(false),
		disabled = false,
		label = '',
		description = '',
		class: className = ''
	} = $props();
</script>

<label class={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-3 transition-colors ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'} ${className}`}>
	<span class="min-w-0">
		<span class="block text-sm font-semibold text-slate-800">{label}</span>
		{#if description}
			<span class="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
		{/if}
	</span>
	<span class="relative inline-flex h-6 w-11 shrink-0 items-center">
		<input
			{id}
			{name}
			type="checkbox"
			bind:checked
			{disabled}
			aria-label={label}
			class="peer sr-only"
		/>
		<span class="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#8C5A35] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#8C5A35]"></span>
		<span class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
	</span>
</label>
