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
	const variants = Array.isArray(product?.product_variants) ? product.product_variants : [];
	const normalizedVariants = variants
		.filter((variant) => variant?.is_active !== false)
		.sort((a, b) => Number(a?.display_order ?? 0) - Number(b?.display_order ?? 0))
		.map((variant) => ({
			id: variant.id,
			label: String(variant?.name ?? '').trim(),
			price: parsePrice(variant?.price),
			variant
		}))
		.filter((item) => item.label && item.price > 0);

	if (normalizedVariants.length > 0) {
		return normalizedVariants;
	}

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
	if (sizePrices.length > 0) {
		return Math.min(...sizePrices.map((item) => item.price));
	}

	return parsePrice(product?.base_price);
}

export function getSizePrice(product = {}, selectedSize = '') {
	const sizePrices = normalizeSizePrices(product);
	const match = sizePrices.find((item) => item.label === selectedSize);
	return match?.price || getStartFromPrice(product);
}

export function getSizePriceOptions(product = {}) {
	const variantSizes = normalizeSizePrices(product).filter((item) => item.variant);
	if (variantSizes.length > 0) return variantSizes;

	const addonSizes = getProductAddons(product).filter((addon) => addon.category === 'size');
	if (addonSizes.length > 0) {
		const basePrice = parsePrice(product?.base_price);
		return addonSizes.map((addon) => ({
			label: addon.name,
			price: basePrice + addon.price,
			additional_price: addon.price,
			addon
		}));
	}

	return normalizeSizePrices(product);
}

export function normalizeAddon(addon = {}) {
	const price = parsePrice(addon.additional_price ?? addon.price);
	const darkColorSurcharge = parsePrice(addon.dark_color_surcharge);

	return {
		id: addon.id,
		category: String(addon.category ?? '').trim(),
		name: String(addon.name ?? addon.label ?? '').trim(),
		price,
		additional_price: price,
		is_active: addon.is_active !== false,
		product_addon_is_active: addon.product_addon_is_active !== false,
		is_dark_color: Boolean(addon.is_dark_color),
		dark_color_surcharge: darkColorSurcharge
	};
}

export function getProductAddons(product = {}) {
	const linkedAddons = Array.isArray(product?.product_addons)
		? product.product_addons
			.map((item) => {
				const addon = item.global_addons ?? item;
				return addon ? { ...addon, product_addon_is_active: item.is_active !== false } : null;
			})
			.filter(Boolean)
		: [];
	const globalAddons = Array.isArray(product?.global_addons) ? product.global_addons : [];
	const source = linkedAddons.length > 0 ? linkedAddons : globalAddons;

	return source
		.map(normalizeAddon)
		.filter((addon) => addon.category && addon.name && addon.is_active && addon.product_addon_is_active);
}

export function getAddonsByCategory(product = {}) {
	return getProductAddons(product).reduce((groups, addon) => {
		groups[addon.category] = [...(groups[addon.category] ?? []), addon];
		return groups;
	}, {});
}

export function getAddonPrice(product = {}, category = '', name = '') {
	const addon = getAddonsByCategory(product)[category]?.find((item) => item.name === name);
	if (!addon) return 0;
	return addon.price + (addon.is_dark_color ? addon.dark_color_surcharge : 0);
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
