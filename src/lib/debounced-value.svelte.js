export function createDebouncedValue(getValue, delay = 250) {
	let settledValue = $state(getValue());

	$effect(() => {
		const value = getValue();
		const timer = setTimeout(() => {
			settledValue = value;
		}, delay);
		return () => clearTimeout(timer);
	});

	return () => settledValue;
}
