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
