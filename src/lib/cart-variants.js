export function cartVariantId(item = {}) {
	return item.product_variant_id || item.productVariantId || item.customized_options?.size?.variant_id || null;
}

export function hasCartVariantSelection(item = {}) {
	return Boolean(cartVariantId(item)) || (item.variant_selection_version === 1 && item.requires_variant === false);
}
