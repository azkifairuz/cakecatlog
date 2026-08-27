import { normalizeLocale, translate } from '$lib/i18n.svelte.js';
import { normalizeSiteInfo } from '$lib/site-info.js';
import { sendOrderConfirmationEmail } from '$lib/server/order-confirmation-email.js';
import { getAddonSelectionPrice, getProductAddons, parsePrice } from '$lib/pricing.js';
import { normalizePhoneNumber, PhoneNumberError } from '$lib/phone-number.js';

const ORDER_CONFIRMATION_SELECT = `
	*,
	products (
		name
	),
	order_items (
		*,
		products (
			name
		)
	)
`;

const OPTIONAL_ORDER_COLUMNS = [
	'product_variant_id',
	'estimated_subtotal',
	'size_price',
	'dark_color_surcharge',
	'cake_topper_fee',
	'estimated_unit_price',
	'has_cake_topper',
	'customized_options'
];

const OPTIONAL_ORDER_ITEM_COLUMNS = [
	'product_variant_id',
	'size_price',
	'dark_color_surcharge',
	'cake_topper_fee',
	'estimated_unit_price',
	'estimated_subtotal',
	'has_cake_topper',
	'customized_options'
];

function isSchemaCacheColumnError(error) {
	return error?.code === 'PGRST204' || String(error?.message || '').includes('schema cache');
}

function withoutColumns(payload, columns) {
	const copy = { ...payload };
	for (const column of columns) delete copy[column];
	return copy;
}

async function repriceCartItems(supabase, submittedItems) {
	const productIds = [...new Set(submittedItems.map((item) => String(item?.product_id || '')).filter(Boolean))];
	if (productIds.length === 0) throw new Error('Produk dalam cart tidak valid.');

	const [productsResult, addonsResult] = await Promise.all([
		supabase
			.from('products')
			.select(`
				id, name, base_price, is_active, is_available,
				product_variants ( id, name, price, is_active ),
				product_addons ( addon_id, is_active )
			`)
			.in('id', productIds),
		supabase.from('global_addons').select('*')
	]);

	if (productsResult.error || addonsResult.error) throw new Error('Harga produk tidak dapat diperiksa. Coba lagi.');
	const productMap = new Map((productsResult.data ?? []).map((product) => [product.id, product]));
	const globalAddons = addonsResult.data ?? [];
	const canonicalItems = [];

	for (const submitted of submittedItems) {
		const product = productMap.get(submitted.product_id);
		if (!product || product.is_active === false || product.is_available === false) {
			throw new Error('Salah satu produk sudah tidak tersedia. Perbarui cart sebelum checkout.');
		}

		const quantity = Number.parseInt(submitted.quantity, 10);
		if (!Number.isInteger(quantity) || quantity < 1) throw new Error(`Jumlah ${product.name} tidak valid.`);

		const effectiveAddons = getProductAddons(product, globalAddons);
		const addonMap = new Map(effectiveAddons.map((addon) => [addon.id, addon]));
		const variantId = submitted.product_variant_id || submitted.customized_options?.size?.variant_id || null;
		const sizeAddonId = submitted.customized_options?.size?.addon_id || null;
		let sizePrice = parsePrice(product.base_price);
		let canonicalSize = null;

		if (variantId) {
			const variant = (product.product_variants ?? []).find((item) => item.id === variantId && item.is_active !== false);
			if (!variant) throw new Error(`Pilihan ukuran ${product.name} sudah tidak tersedia.`);
			sizePrice = parsePrice(variant.price);
			canonicalSize = { name: variant.name, price: sizePrice, variant_id: variant.id, addon_id: null };
		} else if (sizeAddonId) {
			const sizeAddon = addonMap.get(sizeAddonId);
			if (!sizeAddon || sizeAddon.category_key !== 'size') throw new Error(`Pilihan ukuran ${product.name} sudah tidak tersedia.`);
			sizePrice += getAddonSelectionPrice(sizeAddon);
			canonicalSize = { name: sizeAddon.name, price: sizePrice, variant_id: null, addon_id: sizeAddon.id };
		} else {
			canonicalSize = { name: submitted.customized_options?.size?.name || submitted.cake_size || 'Custom', price: sizePrice, variant_id: null, addon_id: null };
		}

		const requestedAddons = Array.isArray(submitted.customized_options?.addons)
			? submitted.customized_options.addons
			: ['flavor', 'color', 'crown', 'glitter', 'cake_topper']
				.map((key) => {
					const legacy = submitted.customized_options?.[key];
					if (!legacy?.name || legacy.selected === false) return null;
					const match = effectiveAddons.find((addon) => addon.category_key === key && addon.name === legacy.name);
					return match ? { addon_id: match.id } : null;
				})
				.filter(Boolean);
		const seenCategories = new Set();
		const canonicalAddons = [];
		let addonPrice = 0;
		let darkColorSurcharge = 0;

		for (const requested of requestedAddons) {
			const addon = addonMap.get(requested?.addon_id);
			if (!addon || addon.category_key === 'size') throw new Error(`Pilihan addon ${product.name} sudah tidak tersedia.`);
			if (seenCategories.has(addon.category_key)) throw new Error(`Hanya satu pilihan diperbolehkan untuk kategori ${addon.category}.`);
			seenCategories.add(addon.category_key);
			const price = getAddonSelectionPrice(addon);
			addonPrice += price;
			if (addon.is_dark_color) darkColorSurcharge += parsePrice(addon.dark_color_surcharge);
			canonicalAddons.push({ addon_id: addon.id, category: addon.category, category_key: addon.category_key, name: addon.name, price });
		}

		const optionFor = (key) => canonicalAddons.find((addon) => addon.category_key === key) ?? null;
		const cakeTopper = optionFor('cake_topper');
		const estimatedUnitPrice = sizePrice + addonPrice;
		const customizedOptions = {
			size: canonicalSize,
			addons: canonicalAddons,
			flavor: optionFor('flavor'), color: optionFor('color'), crown: optionFor('crown'), glitter: optionFor('glitter'),
			cake_topper: cakeTopper ? { ...cakeTopper, selected: true } : { selected: false, price: 0 }
		};

		canonicalItems.push({
			...submitted,
			product_name: product.name,
			product_variant_id: canonicalSize.variant_id,
			quantity,
			cake_size: canonicalSize.name,
			cake_flavor: optionFor('flavor')?.name || 'Standard',
			cake_color: optionFor('color')?.name || null,
			crown_option: optionFor('crown')?.name || null,
			add_edible_glitter: optionFor('glitter')?.name || null,
			price_at_order: estimatedUnitPrice,
			base_price_at_order: parsePrice(product.base_price),
			size_price: sizePrice,
			dark_color_surcharge: darkColorSurcharge,
			cake_topper_fee: cakeTopper?.price || 0,
			estimated_unit_price: estimatedUnitPrice,
			estimated_subtotal: estimatedUnitPrice * quantity,
			has_cake_topper: Boolean(cakeTopper),
			customized_options: customizedOptions
		});
	}

	return {
		items: canonicalItems,
		total: canonicalItems.reduce((sum, item) => sum + item.estimated_subtotal, 0)
	};
}

export const actions = {
	checkout: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const locale = normalizeLocale(formData.get('locale'));
		
		const customer_name = formData.get('customer_name');
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const submittedPhoneNumber = formData.get('phone_number');
		const phoneCountry = String(formData.get('phone_country') || 'ID').toUpperCase();
		const rawDeliveryOption = formData.get('delivery_option');
		const delivery_option = rawDeliveryOption === 'pickup' || rawDeliveryOption === 'delivery' ? rawDeliveryOption : null;
		const submittedAddress = String(formData.get('address') || '').trim();
		const delivery_date = formData.get('delivery_date');
		const submittedDeliveryTime = String(formData.get('delivery_time') || '').trim();
		const total_price = formData.get('total_price');
		const cart_items_json = formData.get('cart_items');

		if (!delivery_option) {
			return { success: false, error: translate(locale, 'server.invalidDeliveryOption') };
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return { success: false, error: translate(locale, 'server.invalidEmail') };
		}

		let phone_number;
		try {
			phone_number = normalizePhoneNumber(submittedPhoneNumber, { country: phoneCountry });
		} catch (error) {
			if (error instanceof PhoneNumberError) {
				return { success: false, error: translate(locale, 'server.invalidWhatsapp') };
			}
			throw error;
		}

		if (delivery_option === 'delivery' && !submittedAddress) {
			return { success: false, error: translate(locale, 'server.deliveryAddressRequired') };
		}

		if (delivery_option === 'delivery' && !submittedDeliveryTime) {
			return { success: false, error: translate(locale, 'server.deliveryTimeRequired') };
		}

		const address = delivery_option === 'pickup' ? 'Pickup' : submittedAddress;
		const delivery_time = submittedDeliveryTime || null;

		let cartItems = [];
		try {
			cartItems = JSON.parse(cart_items_json);
		} catch (e) {
			console.error('Failed to parse cart items', e);
			return { success: false, error: translate(locale, 'server.invalidCart') };
		}

		if (cartItems.length === 0) {
			return { success: false, error: translate(locale, 'server.emptyCart') };
		}

		try {
			const repriced = await repriceCartItems(supabase, cartItems);
			cartItems = repriced.items;
			if (Math.abs((parseFloat(total_price) || 0) - repriced.total) > 0.01) {
				return { success: false, error: 'Harga cart telah berubah. Kembali ke cart untuk melihat harga terbaru.' };
			}
		} catch (pricingError) {
			return { success: false, error: pricingError.message || 'Pilihan produk tidak valid.' };
		}

		const firstItem = cartItems[0];
		const estimatedSubtotal = cartItems.reduce((sum, item) => sum + item.estimated_subtotal, 0);

		const orderPayload = {
			customer_name,
			email,
			phone_number,
			delivery_option,
			address,
			delivery_date,
			delivery_time,
			status: 'Pending',
			// Legacy fields to bypass RLS:
			product_id: cartItems[0].product_id,
			product_variant_id: firstItem.product_variant_id || null,
			quantity: 1,
			cake_size: cartItems[0].cake_size || 'Custom',
			cake_flavor: cartItems[0].cake_flavor || '-',
			cake_color: cartItems[0].cake_color || null,
			crown_option: cartItems[0].crown_option || null,
			add_edible_glitter: cartItems[0].add_edible_glitter || null,
			cake_text: cartItems[0].cake_text || null,
			gift_card_text: cartItems[0].gift_card_text || null,
			reference_image_url: cartItems[0].reference_image_url || null,
			amount: estimatedSubtotal,
			estimated_subtotal: estimatedSubtotal,
			size_price: firstItem.size_price || firstItem.price_at_order || 0,
			dark_color_surcharge: firstItem.dark_color_surcharge || 0,
			cake_topper_fee: firstItem.cake_topper_fee || 0,
			estimated_unit_price: firstItem.estimated_unit_price || firstItem.price_at_order || 0,
			has_cake_topper: Boolean(firstItem.has_cake_topper),
			customized_options: firstItem.customized_options || null
		};

		// 1. Insert Order
		let { data: orderData, error: orderError } = await supabase
			.from('orders')
			.insert(orderPayload)
			.select('id')
			.single();

		if (isSchemaCacheColumnError(orderError)) {
			({ data: orderData, error: orderError } = await supabase
				.from('orders')
				.insert(withoutColumns(orderPayload, OPTIONAL_ORDER_COLUMNS))
				.select('id')
				.single());
		}

		if (orderError) {
			console.error('Order Error:', orderError);
			return { success: false, error: orderError.message };
		}

		const orderId = orderData.id;

		// 2. Insert Order Items
		const itemsToInsert = cartItems.map(item => ({
			order_id: orderId,
			product_id: item.product_id,
			product_variant_id: item.product_variant_id || null,
			quantity: item.quantity,
			cake_size: item.cake_size,
			cake_flavor: item.cake_flavor,
			cake_color: item.cake_color,
			crown_option: item.crown_option,
			add_edible_glitter: item.add_edible_glitter,
			cake_text: item.cake_text,
			gift_card_text: item.gift_card_text,
			reference_image_url: item.reference_image_url,
			price_at_order: item.price_at_order,
			size_price: item.size_price || item.price_at_order || 0,
			dark_color_surcharge: item.dark_color_surcharge || 0,
			cake_topper_fee: item.cake_topper_fee || 0,
			estimated_unit_price: item.estimated_unit_price || item.price_at_order || 0,
			estimated_subtotal: item.estimated_subtotal || ((item.estimated_unit_price || item.price_at_order || 0) * (item.quantity || 1)),
			has_cake_topper: Boolean(item.has_cake_topper),
			customized_options: item.customized_options || null
		}));

		let { error: itemsError } = await supabase
			.from('order_items')
			.insert(itemsToInsert);

		if (isSchemaCacheColumnError(itemsError)) {
			({ error: itemsError } = await supabase
				.from('order_items')
				.insert(itemsToInsert.map((item) => withoutColumns(item, OPTIONAL_ORDER_ITEM_COLUMNS))));
		}

		if (itemsError) {
			console.error('Items Error:', itemsError);
			return { success: false, error: itemsError.message };
		}

		try {
			const [{ data: order }, { data: siteInfo }] = await Promise.all([
				supabase.from('orders').select(ORDER_CONFIRMATION_SELECT).eq('id', orderId).single(),
				supabase.from('site_contact_info').select('*').eq('id', 'main').maybeSingle()
			]);

			if (order) {
				const emailResult = await sendOrderConfirmationEmail(order, normalizeSiteInfo(siteInfo));
				if (!emailResult.success && !emailResult.skipped) {
					console.error('Order confirmation email failed:', emailResult.message);
				}
			}
		} catch (emailError) {
			console.error('Order confirmation email error:', emailError);
		}

		return { success: true, orderId };
	}
};
