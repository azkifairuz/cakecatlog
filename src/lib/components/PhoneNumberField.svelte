<script>
	import * as Field from '$lib/components/ui/field';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import {
		detectPhoneCountry,
		getPhoneCountryOptions
	} from '$lib/phone-number.js';

	let {
		id = 'phone_number',
		name = 'phone_number',
		countryName = 'phone_country',
		country = $bindable('ID'),
		value = $bindable(''),
		locale = 'id',
		label,
		placeholder,
		description,
		error = '',
		required = false
	} = $props();

	let countries = $derived(getPhoneCountryOptions(locale));
	let selectedCountry = $derived(
		countries.find((option) => option.country === country) ?? countries.find((option) => option.country === 'ID')
	);

	function handleInput(event) {
		value = event.currentTarget.value;
		const detectedCountry = detectPhoneCountry(value);
		if (detectedCountry) country = detectedCountry;
	}
</script>

<Field.Field data-invalid={error ? true : undefined}>
	<Field.FieldLabel for={id}>
		{label}
		{#if required}<span aria-hidden="true">*</span>{/if}
	</Field.FieldLabel>

	<div class="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
		<input type="hidden" name={countryName} value={country} />
		<Select.Root type="single" bind:value={country}>
			<Select.Trigger aria-label={locale === 'en' ? 'Phone country' : 'Negara nomor telepon'} aria-invalid={error ? true : undefined} class="w-full">
				<span class="truncate">+{selectedCountry?.callingCode} {selectedCountry?.country}</span>
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					{#each countries as option (option.country)}
						<Select.Item value={option.country} label={`${option.name} (+${option.callingCode})`}>
							<span class="truncate">{option.name}</span>
							<span class="text-muted-foreground">+{option.callingCode}</span>
						</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>

		<Input
			{id}
			{name}
			type="tel"
			inputmode="tel"
			autocomplete="tel"
			{placeholder}
			{required}
			aria-invalid={error ? true : undefined}
			value={value}
			oninput={handleInput}
		/>
	</div>

	{#if error}
		<Field.FieldError>{error}</Field.FieldError>
	{:else if description}
		<Field.FieldDescription>{description}</Field.FieldDescription>
	{/if}
</Field.Field>
