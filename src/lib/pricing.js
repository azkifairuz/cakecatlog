export const CAKE_TOPPER_FEE = 150000;

const DARK_COLOR_KEYWORDS = ['merah', 'hitam', 'navy', 'chocolate', 'forest green'];
const FALLBACK_SIZES = ['8cm', '10cm', '12cm', 'Custom'];

export function parseCommaOptions(value) {
	if (!value) return [];
	return String(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

export function parsePrice(value) {
	const numeric = String(value ?? '').replace(/\D/g, '');
	return numeric ? Number(numeric) : 0;
}

export function normalizeSizePrices(product = {}) {
	const rawSizePrices = product?.size_prices;
	const sizePrices = Array.isArray(rawSizePrices)
		? rawSizePrices
		: typeof rawSizePrices === 'string'
			? safeParseJson(rawSizePrices)
			: [];

	const normalized = sizePrices
		.map((item) => ({
			label: String(item?.label ?? item?.size ?? '').trim(),
			price: parsePrice(item?.price)
		}))
		.filter((item) => item.label && item.price > 0);

	if (normalized.length > 0) {
		return normalized;
	}

	const legacySizes = parseCommaOptions(product?.sizes);
	const basePrice = parsePrice(product?.base_price);
	const fallbackLabels = legacySizes.length > 0 ? legacySizes : FALLBACK_SIZES;

	return fallbackLabels.map((label) => ({
		label,
		price: basePrice
	}));
}

export function getStartFromPrice(product = {}) {
	const sizePrices = normalizeSizePrices(product);
	const prices = sizePrices.map((item) => item.price).filter((price) => price > 0);
	return prices.length > 0 ? Math.min(...prices) : parsePrice(product?.base_price);
}

export function getSizePrice(product = {}, selectedSize = '') {
	const sizePrices = normalizeSizePrices(product);
	const match = sizePrices.find((item) => item.label === selectedSize);
	return match?.price || getStartFromPrice(product);
}

export function isDarkColor(color = '') {
	const normalized = String(color).trim().toLowerCase();
	return DARK_COLOR_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function safeParseJson(value) {
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
