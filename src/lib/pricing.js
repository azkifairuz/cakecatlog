const DARK_COLOR_KEYWORDS = ['merah', 'hitam', 'navy', 'chocolate', 'forest green'];

export function parseCommaOptions(value) {
	if (!value) return [];
	return String(value)
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

export function parsePrice(value) {
	const amount = Number(typeof value === 'string' ? value.trim().replace(/,/g, '') : value);
	return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

export const BASE_SIZE_ID = '__base__';

export function normalizeSizePrices(product = {}) {
	const variants = product?.product_variants ?? product?.variants ?? [];
	return (Array.isArray(variants) ? variants : [])
		.filter((variant) => variant?.id && (variant.is_active ?? variant.isActive) !== false)
		.slice()
		.sort((a, b) => Number(a.display_order ?? a.displayOrder ?? 0) - Number(b.display_order ?? b.displayOrder ?? 0))
		.map((variant) => ({ id: variant.id, label: String(variant.name ?? ''), price: parsePrice(variant.price), variant }));
}

export function getStartFromPrice(product = {}) {
	const variants = normalizeSizePrices(product);
	return variants.length ? Math.min(...variants.map((item) => item.price)) : parsePrice(product?.base_price ?? product?.basePrice);
}

export function getSizePriceOptions(product = {}) {
	const variants = product?.product_variants ?? product?.variants ?? [];
	if (Array.isArray(variants) && variants.length) return normalizeSizePrices(product);
	return [{ id: BASE_SIZE_ID, label: 'Standard', price: parsePrice(product?.base_price ?? product?.basePrice), variant: null }];
}

export function getSizePrice(product = {}, variantId = '') {
	const option = getSizePriceOptions(product).find((item) => item.id === variantId);
	if (!option) throw new Error('Pilih ukuran produk kembali sebelum memesan.');
	return option.price;
}

export function normalizeAddon(addon = {}) {
	const price = parsePrice(addon.additional_price ?? addon.price);
	const darkColorSurcharge = parsePrice(addon.dark_color_surcharge);
	const id = addon.id ?? addon.addon_id ?? addon.addonId;

	return {
		id,
		addon_id: id,
		category: String(addon.category ?? '').trim(),
		category_key: normalizeCategoryKey(addon.category),
		name: String(addon.name ?? addon.label ?? '').trim(),
		price,
		additional_price: price,
		is_active: addon.is_active !== false,
		product_addon_is_active: addon.product_addon_is_active !== false,
		is_dark_color: Boolean(addon.is_dark_color),
		dark_color_surcharge: darkColorSurcharge
	};
}

function hasOwnArray(object, key) {
	return Object.prototype.hasOwnProperty.call(object ?? {}, key) && Array.isArray(object?.[key]);
}

function normalizeProductAddonSource(item = {}) {
	const addon = item.global_addons ?? item.addon ?? item;
	const productAddonActive = item.is_active ?? item.isActive ?? true;

	return {
		...addon,
		id: addon.id ?? item.addon_id ?? item.addonId,
		addon_id: addon.id ?? item.addon_id ?? item.addonId,
		category: addon.category ?? item.category,
		name: addon.name ?? item.name,
		additional_price:
			addon.additional_price ??
			addon.additionalPrice ??
			addon.price ??
			item.additional_price ??
			item.additionalPrice ??
			item.price,
		is_active: (addon.is_active ?? addon.isActive ?? true) !== false,
		product_addon_is_active: productAddonActive !== false,
		is_dark_color: addon.is_dark_color ?? addon.isDarkColor ?? item.is_dark_color ?? item.isDarkColor,
		dark_color_surcharge:
			addon.dark_color_surcharge ??
			addon.darkColorSurcharge ??
			item.dark_color_surcharge ??
			item.darkColorSurcharge
	};
}

export function normalizeCategoryKey(category = '') {
	return String(category)
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

export function getProductAddons(product = {}, suppliedGlobalAddons) {
	if (hasOwnArray(product, 'addons') || hasOwnArray(product, 'product_addons')) {
		const productAddons = hasOwnArray(product, 'addons') ? product.addons : product.product_addons;

		return productAddons
			.map(normalizeProductAddonSource)
			.map(normalizeAddon)
			.filter((addon) => addon.id && addon.category_key && addon.name && addon.is_active && addon.product_addon_is_active);
	}

	const globalAddons = Array.isArray(suppliedGlobalAddons)
		? suppliedGlobalAddons
		: Array.isArray(product?.global_addons)
			? product.global_addons
			: [];

	return globalAddons
		.map(normalizeAddon)
		.filter((addon) => addon.category_key && addon.name && addon.is_active && addon.product_addon_is_active);
}

export function getAddonsByCategory(product = {}, suppliedGlobalAddons) {
	return getProductAddons(product, suppliedGlobalAddons).reduce((groups, addon) => {
		groups[addon.category_key] = [...(groups[addon.category_key] ?? []), addon];
		return groups;
	}, {});
}

export function getAddonPrice(product = {}, category = '', name = '') {
	const addon = getAddonsByCategory(product)[category]?.find((item) => item.name === name);
	if (!addon) return 0;
	return addon.price + (addon.is_dark_color ? addon.dark_color_surcharge : 0);
}

export function getAddonSelectionPrice(addon = {}) {
	const normalized = normalizeAddon(addon);
	return normalized.price + (normalized.is_dark_color ? normalized.dark_color_surcharge : 0);
}

export function getDynamicAddonGroups(product = {}, suppliedGlobalAddons) {
	return Object.entries(getAddonsByCategory(product, suppliedGlobalAddons))
		.filter(([categoryKey, addons]) => categoryKey !== 'size' && addons.length > 0)
		.map(([key, addons]) => ({ key, label: addons[0].category, addons }));
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
