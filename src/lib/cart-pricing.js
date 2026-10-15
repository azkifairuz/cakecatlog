import { cartVariantId } from './cart-variants.js';

export function cartOrderItem(item) {
	const options = item.customized_options || {};
	return {
		productId: item.product_id || item.productId,
		productVariantId: cartVariantId(item), quantity: Number(item.quantity) || 1,
		cakeSize: item.cake_size || options.size?.name || 'Standard',
		cakeFlavor: item.cake_flavor || options.flavor?.name || 'Standard',
		cakeColor: item.cake_color || options.color?.name || null,
		crownOption: item.crown_option || options.crown?.name || null,
		addEdibleGlitter: item.add_edible_glitter || options.glitter?.name || null,
		hasCakeTopper: Boolean(item.has_cake_topper || options.cake_topper?.selected),
		cakeTopperFee: item.cake_topper_fee ?? options.cake_topper?.price ?? 0,
		customizedOptions: { ...options, cake_text: item.cake_text, gift_card_text: item.gift_card_text,
			reference_image_url: item.reference_image_url || item.referenceImageUrl },
		selectedAddonIds: Array.isArray(options.addons)
			? options.addons.map(addon => typeof addon === 'string' ? addon : addon.addon_id || addon.id).filter(Boolean) : []
	};
}

export function cartSelectionKey(items) {
	return JSON.stringify(items.map(item => {
		const input = cartOrderItem(item);
		return [item.cartItemId, input.productId, input.productVariantId, input.quantity,
			input.selectedAddonIds.slice().sort(), input.hasCakeTopper,
			input.customizedOptions.cake_topper?.addon_id || input.customizedOptions.cake_topper?.id || null,
			input.cakeFlavor, input.cakeColor, input.crownOption, input.addEdibleGlitter];
	}));
}

export function applyCartQuote(current, snapshot, priced) {
	if (cartSelectionKey(current) !== cartSelectionKey(snapshot) || !Array.isArray(priced) || priced.length !== current.length) return null;
	if (priced.some((item, index) => item.productId !== cartOrderItem(snapshot[index]).productId ||
		(item.productVariantId ?? null) !== cartVariantId(snapshot[index]) ||
		item.quantity !== (Number(snapshot[index].quantity) || 1) ||
		!Number.isFinite(item.estimatedUnitPrice) || item.estimatedUnitPrice < 0)) return null;
	return current.map((item, index) => {
		const quote = priced[index];
		return { ...item, product_name: quote.productName, cake_size: quote.cakeSize,
			price_at_order: quote.estimatedUnitPrice, estimated_unit_price: quote.estimatedUnitPrice,
			estimated_subtotal: quote.estimatedSubtotal, size_price: quote.sizePrice,
			base_price_at_order: quote.basePrice, dark_color_surcharge: quote.darkColorSurcharge,
			has_cake_topper: quote.hasCakeTopper, cake_topper_fee: quote.cakeTopperFee,
			customized_options: { ...(item.customized_options || {}), size: quote.customizedOptions?.size,
				addons: quote.customizedOptions?.addons || [], cake_topper: quote.customizedOptions?.cake_topper }
		};
	});
}
