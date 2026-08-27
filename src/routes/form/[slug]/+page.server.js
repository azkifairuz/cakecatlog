import { error as httpError } from '@sveltejs/kit';
import { getOrderFormBySlug } from '$lib/server/order-forms.js';
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

export const load = async ({ params, locals: { supabase } }) => {
	const { slug } = params;

	const [formRecord, productsRes, addonsRes, siteInfoRes] = await Promise.all([
		getOrderFormBySlug(supabase, slug),
		supabase
			.from('products')
			.select(`
				id,
				name,
				base_price,
				description,
				handling_warning,
				is_active,
				is_available,
				product_variants (
					id,
					name,
					price,
					is_active,
					display_order
				),
				product_addons (
					addon_id,
					is_active
				),
				product_images (
					id,
					image_url,
					is_primary
				),
				categories (
					id,
					name
				)
			`)
			.eq('is_active', true)
			.order('name', { ascending: true }),
		supabase.from('global_addons').select('*').order('name', { ascending: true }),
		supabase.from('site_contact_info').select('*').eq('id', 'main').maybeSingle()
	]);

	const products = productsRes.data ?? [];
	const globalAddons = addonsRes.data ?? [];
	const siteInfo = normalizeSiteInfo(siteInfoRes.data);

	// If a form record exists, increment view count asynchronously
	if (formRecord?.id) {
		void supabase
			.from('order_forms')
			.update({ views_count: (formRecord.views_count || 0) + 1 })
			.eq('id', formRecord.id);
	}

	// Fallback if form not found in DB: check if slug is product ID or product slug
	if (!formRecord) {
		const matchedProduct = products.find(
			(p) => p.id === slug || p.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug.toLowerCase()
		);

		if (!matchedProduct) {
			throw httpError(404, 'Form pemesanan tidak ditemukan atau sudah tidak aktif.');
		}

		return {
			customForm: null,
			products: [matchedProduct],
			globalAddons,
			siteInfo,
			initialProductId: matchedProduct.id,
			bannerText: ''
		};
	}

	// If formRecord is locked to a specific product
	const initialProductId = formRecord.product_id || products[0]?.id || '';
	const scopedProducts = formRecord.product_id
		? products.filter((p) => p.id === formRecord.product_id)
		: products;

	return {
		customForm: formRecord,
		products: scopedProducts.length > 0 ? scopedProducts : products,
		globalAddons,
		siteInfo,
		initialProductId,
		bannerText: formRecord.banner_text || formRecord.title || ''
	};
};

export const actions = {
	order: async ({ request, params, locals: { supabase } }) => {
		const formData = await request.formData();
		const locale = normalizeLocale(formData.get('locale'));

		const product_id = formData.get('product_id');
		const customer_name = String(formData.get('customer_name') || '').trim();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const submittedPhoneNumber = formData.get('phone_number');
		const phoneCountry = String(formData.get('phone_country') || 'ID').toUpperCase();
		const rawDeliveryOption = formData.get('delivery_option');
		const delivery_option = rawDeliveryOption === 'pickup' || rawDeliveryOption === 'delivery' ? rawDeliveryOption : null;
		const submittedAddress = String(formData.get('address') || '').trim();
		const delivery_date = formData.get('delivery_date');
		const submittedDeliveryTime = String(formData.get('delivery_time') || '').trim();
		const quantity = Math.max(parseInt(formData.get('quantity'), 10) || 1, 1);
		const selected_size = String(formData.get('cake_size') || '').trim();
		const cake_text = String(formData.get('cake_text') || formData.get('add_on') || '').trim() || null;
		const gift_card_text = String(formData.get('gift_card_text') || '').trim() || null;
		const customized_options_json = formData.get('customized_options');

		if (!product_id) {
			return { success: false, error: 'Silakan pilih varian kue yang ingin dipesan.' };
		}

		if (!customer_name) {
			return { success: false, error: 'Nama pemesan wajib diisi.' };
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

		if (!delivery_option) {
			return { success: false, error: translate(locale, 'server.invalidDeliveryOption') };
		}

		if (delivery_option === 'delivery' && !submittedAddress) {
			return { success: false, error: translate(locale, 'server.deliveryAddressRequired') };
		}

		if (delivery_option === 'delivery' && !submittedDeliveryTime) {
			return { success: false, error: translate(locale, 'server.deliveryTimeRequired') };
		}

		const address = delivery_option === 'pickup' ? 'Pickup' : submittedAddress;
		const delivery_time = submittedDeliveryTime || null;

		// 1. Fetch live product and addons from DB for safe repricing
		const [productRes, addonsRes] = await Promise.all([
			supabase
				.from('products')
				.select(`
					id, name, base_price, is_active, is_available,
					product_variants ( id, name, price, is_active ),
					product_addons ( addon_id, is_active )
				`)
				.eq('id', product_id)
				.single(),
			supabase.from('global_addons').select('*')
		]);

		if (productRes.error || !productRes.data || productRes.data.is_active === false || productRes.data.is_available === false) {
			return { success: false, error: 'Kue yang dipilih sedang tidak tersedia.' };
		}

		const product = productRes.data;
		const globalAddons = addonsRes.data ?? [];
		const effectiveAddons = getProductAddons(product, globalAddons);
		const addonMap = new Map(effectiveAddons.map((addon) => [addon.id, addon]));

		// Parse submitted options
		let clientOptions = {};
		try {
			if (customized_options_json) {
				clientOptions = JSON.parse(customized_options_json);
			}
		} catch (e) {
			clientOptions = {};
		}

		// Calculate size price
		const variantId = clientOptions?.size?.variant_id || formData.get('product_variant_id') || null;
		let sizePrice = parsePrice(product.base_price);
		let canonicalSize = { name: selected_size || 'Standard', price: sizePrice, variant_id: null, addon_id: null };

		if (variantId) {
			const variant = (product.product_variants ?? []).find((v) => v.id === variantId && v.is_active !== false);
			if (variant) {
				sizePrice = parsePrice(variant.price);
				canonicalSize = { name: variant.name, price: sizePrice, variant_id: variant.id, addon_id: null };
			}
		} else if (selected_size) {
			const matchedVariant = (product.product_variants ?? []).find((v) => v.name === selected_size && v.is_active !== false);
			if (matchedVariant) {
				sizePrice = parsePrice(matchedVariant.price);
				canonicalSize = { name: matchedVariant.name, price: sizePrice, variant_id: matchedVariant.id, addon_id: null };
			}
		}

		// Calculate addons price
		const requestedAddonIds = Array.isArray(clientOptions?.addons)
			? clientOptions.addons.map((a) => (typeof a === 'string' ? a : a?.addon_id || a?.id)).filter(Boolean)
			: [];

		for (const [key, value] of formData.entries()) {
			if (key.startsWith('addon_') && value && typeof value === 'string' && !requestedAddonIds.includes(value)) {
				requestedAddonIds.push(value);
			}
		}

		const canonicalAddons = [];
		let addonPrice = 0;
		let darkColorSurcharge = 0;
		const seenCategories = new Set();

		for (const addonId of requestedAddonIds) {
			const addon = addonMap.get(addonId);
			if (addon && addon.category_key !== 'size' && !seenCategories.has(addon.category_key)) {
				seenCategories.add(addon.category_key);
				const price = getAddonSelectionPrice(addon);
				addonPrice += price;
				if (addon.is_dark_color) darkColorSurcharge += parsePrice(addon.dark_color_surcharge);
				canonicalAddons.push({
					addon_id: addon.id,
					category: addon.category,
					category_key: addon.category_key,
					name: addon.name,
					price
				});
			}
		}

		const optionFor = (key) => canonicalAddons.find((addon) => addon.category_key === key) ?? null;
		const cakeTopper = optionFor('cake_topper');
		const estimatedUnitPrice = sizePrice + addonPrice;
		const estimatedSubtotal = estimatedUnitPrice * quantity;

		const customizedOptions = {
			size: canonicalSize,
			addons: canonicalAddons,
			flavor: optionFor('flavor'),
			color: optionFor('color'),
			crown: optionFor('crown'),
			glitter: optionFor('glitter'),
			cake_topper: cakeTopper ? { ...cakeTopper, selected: true } : { selected: false, price: 0 }
		};

		// 2. Handle Reference Image Upload
		let reference_image_url = null;
		try {
			const file = formData.get('reference_image');
			if (file && file instanceof File && file.size > 0) {
				const fileExt = file.name.split('.').pop();
				const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
				const filePath = `cust_reference/${uniqueName}`;

				const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file);

				if (!uploadError) {
					const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(filePath);
					reference_image_url = publicUrlData?.publicUrl || null;
				}
			}
		} catch (uploadEx) {
			console.warn('Reference image upload exception:', uploadEx);
		}

		// 3. Insert into orders table
		const orderPayload = {
			customer_name,
			email,
			phone_number,
			delivery_option,
			address,
			delivery_date,
			delivery_time,
			status: 'Pending',
			product_id: product.id,
			product_variant_id: canonicalSize.variant_id || null,
			quantity,
			cake_size: canonicalSize.name || 'Custom',
			cake_flavor: optionFor('flavor')?.name || 'Standard',
			cake_color: optionFor('color')?.name || null,
			crown_option: optionFor('crown')?.name || null,
			add_edible_glitter: optionFor('glitter')?.name || null,
			cake_text,
			gift_card_text,
			reference_image_url,
			amount: estimatedSubtotal,
			estimated_subtotal: estimatedSubtotal,
			size_price: sizePrice,
			dark_color_surcharge: darkColorSurcharge,
			cake_topper_fee: cakeTopper?.price || 0,
			estimated_unit_price: estimatedUnitPrice,
			has_cake_topper: Boolean(cakeTopper),
			customized_options: customizedOptions
		};

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

		if (orderError || !orderData?.id) {
			console.error('Order Insert Error:', orderError);
			return { success: false, error: orderError?.message || 'Gagal menyimpan pesanan. Silakan coba lagi.' };
		}

		const orderId = orderData.id;

		// 4. Insert into order_items table
		const itemPayload = {
			order_id: orderId,
			product_id: product.id,
			product_variant_id: canonicalSize.variant_id || null,
			quantity,
			cake_size: canonicalSize.name,
			cake_flavor: optionFor('flavor')?.name || 'Standard',
			cake_color: optionFor('color')?.name || null,
			crown_option: optionFor('crown')?.name || null,
			add_edible_glitter: optionFor('glitter')?.name || null,
			cake_text,
			gift_card_text,
			reference_image_url,
			price_at_order: estimatedUnitPrice,
			size_price: sizePrice,
			dark_color_surcharge: darkColorSurcharge,
			cake_topper_fee: cakeTopper?.price || 0,
			estimated_unit_price: estimatedUnitPrice,
			estimated_subtotal: estimatedSubtotal,
			has_cake_topper: Boolean(cakeTopper),
			customized_options: customizedOptions
		};

		let { error: itemsError } = await supabase.from('order_items').insert([itemPayload]);

		if (isSchemaCacheColumnError(itemsError)) {
			({ error: itemsError } = await supabase
				.from('order_items')
				.insert([withoutColumns(itemPayload, OPTIONAL_ORDER_ITEM_COLUMNS)]));
		}

		// 5. Update order form orders_count
		if (params.slug) {
			void supabase.rpc('increment_form_order_count', { form_slug: params.slug });
		}

		// 6. Send order confirmation email
		try {
			const [{ data: freshOrder }, { data: freshSiteInfo }] = await Promise.all([
				supabase.from('orders').select(ORDER_CONFIRMATION_SELECT).eq('id', orderId).single(),
				supabase.from('site_contact_info').select('*').eq('id', 'main').maybeSingle()
			]);

			if (freshOrder) {
				const emailResult = await sendOrderConfirmationEmail(freshOrder, normalizeSiteInfo(freshSiteInfo));
				if (!emailResult.success && !emailResult.skipped) {
					console.error('Confirmation email failed:', emailResult.message);
				}
			}
		} catch (emailEx) {
			console.error('Confirmation email error:', emailEx);
		}

		return { success: true, orderId };
	}
};
