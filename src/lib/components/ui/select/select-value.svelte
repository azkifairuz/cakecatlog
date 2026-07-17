<script>
	import { Select as SelectPrimitive } from 'bits-ui';

	let { placeholder, children, ...restProps } = $props();
</script>

{#if children}
	<SelectPrimitive.Value {placeholder} {...restProps}>
		{@render children()}
	</SelectPrimitive.Value>
{:else}
	<SelectPrimitive.Value {placeholder} {...restProps} />
{/if}
