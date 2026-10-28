export function buildProductVariantRows(productId, variants, createId) {
	const toRow = (variant, id) => ({
		id,
		product_id: productId,
		name: variant.name,
		price: variant.price,
		is_active: variant.is_active,
		display_order: variant.display_order
	});

	return {
		existingVariantRows: variants
			.filter((variant) => variant.id)
			.map((variant) => toRow(variant, variant.id)),
		newVariantRows: variants
			.filter((variant) => !variant.id)
			.map((variant) => toRow(variant, createId()))
	};
}

// Existing rows keep their ID. A new row omits id rather than sending null.
export function serializeProductVariantInputs(variants = []) {
	return variants.map((variant, index) => {
		const id = typeof variant.id === 'string' ? variant.id.trim() : '';
		const order = Number(variant.display_order ?? variant.displayOrder ?? index);
		return {
			...(id ? { id } : {}), name: String(variant.name ?? '').trim(), price: variant.price ?? '',
			isActive: variant.is_active !== false && variant.isActive !== false,
			displayOrder: Number.isFinite(order) ? order : index
		};
	});
}
