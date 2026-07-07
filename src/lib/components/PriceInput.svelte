<script>
	import { cn } from '$lib/utils';
	let {
		id = '',
		name = '',
		value = $bindable(''),
		required = false,
		placeholder = '',
		class: className = ''
	} = $props();

	let rawValue = $state('');
	let displayValue = $state('');

	function formatNumber(numStr) {
		if (!numStr) return '';
		return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	}

	function handleInput(event) {
		// Get input and strip all non-numeric characters
		const inputVal = event.target.value.replace(/\D/g, '');
		
		value = inputVal;
		rawValue = inputVal;
		displayValue = formatNumber(inputVal);
		
		// Update the visible input value manually to force re-render
		// if user typed invalid characters
		event.target.value = displayValue;
	}

	$effect(() => {
		const nextValue = value ? String(value) : '';
		rawValue = nextValue;
		displayValue = formatNumber(nextValue);
	});
</script>

<div class="relative w-full">
	<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
		<span class="text-slate-500 sm:text-sm font-semibold">Rp</span>
	</div>
	
	<!-- Visible Input -->
	<input
		type="text"
		{id}
		{placeholder}
		{required}
		value={displayValue}
		oninput={handleInput}
		class={cn(
			"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-9",
			className
		)}
	/>
	
	<!-- Hidden Input for Form Submission -->
	<input type="hidden" {name} value={rawValue} />
</div>
