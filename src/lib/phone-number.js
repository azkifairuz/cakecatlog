import {
	getCountries,
	getCountryCallingCode,
	parsePhoneNumberFromString
} from 'libphonenumber-js';

const ALLOWED_PHONE_INPUT = /^\+?[\d\s().-]+$/;

export class PhoneNumberError extends Error {
	constructor(message = 'Nomor WhatsApp tidak valid.') {
		super(message);
		this.name = 'PhoneNumberError';
		this.code = 'INVALID_PHONE_NUMBER';
	}
}

function cleanInput(value) {
	const input = String(value ?? '').trim();
	if (!input || !ALLOWED_PHONE_INPUT.test(input)) {
		throw new PhoneNumberError();
	}
	return input;
}

export function normalizePhoneNumber(value, { country } = {}) {
	const input = cleanInput(value);
	const compactDigits = input.replace(/\D/g, '');
	let phoneNumber;

	if (input.startsWith('+')) {
		phoneNumber = parsePhoneNumberFromString(input);
	} else if (country) {
		phoneNumber = parsePhoneNumberFromString(input, country);
	} else if (compactDigits.startsWith('0')) {
		phoneNumber = parsePhoneNumberFromString(input, 'ID');
	} else {
		phoneNumber = parsePhoneNumberFromString(`+${compactDigits}`);
	}

	if (!phoneNumber?.isValid()) {
		throw new PhoneNumberError();
	}

	return phoneNumber.number;
}

export function toWhatsAppDigits(value, options) {
	return normalizePhoneNumber(value, options).slice(1);
}

export function detectPhoneCountry(value) {
	const input = String(value ?? '').trim();
	if (!input.startsWith('+') || !ALLOWED_PHONE_INPUT.test(input)) return null;
	return parsePhoneNumberFromString(input)?.country ?? null;
}

export function getPhoneCountryOptions(locale = 'id') {
	const displayNames = new Intl.DisplayNames([locale === 'en' ? 'en' : 'id'], {
		type: 'region'
	});
	const collator = new Intl.Collator(locale === 'en' ? 'en' : 'id');

	return getCountries()
		.map((country) => ({
			country,
			callingCode: getCountryCallingCode(country),
			name: displayNames.of(country) ?? country
		}))
		.sort((left, right) => collator.compare(left.name, right.name));
}
