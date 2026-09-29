import { normalizeLocale, translate } from '$lib/i18n.svelte.js';
import { normalizePhoneNumber, PhoneNumberError } from '$lib/phone-number.js';
import { submitCheckoutOrder } from '$lib/api/public.js';
import { fail } from '@sveltejs/kit';

export const actions = {
	checkout: async ({ request, fetch }) => {
		const formData = await request.formData();
		const locale = normalizeLocale(formData.get('locale'));

		const customer_name = String(formData.get('customer_name') || '').trim();
		const email = String(formData.get('email') || '').trim().toLowerCase();
		const submittedPhoneNumber = formData.get('phone_number');
		const phoneCountry = String(formData.get('phone_country') || 'ID').toUpperCase();
		const rawDeliveryOption = formData.get('delivery_option');
		const delivery_option =
			rawDeliveryOption === 'pickup' || rawDeliveryOption === 'delivery' ? rawDeliveryOption : null;
		const submittedAddress = String(formData.get('address') || '').trim();
		const delivery_date = formData.get('delivery_date');
		const submittedDeliveryTime = String(formData.get('delivery_time') || '').trim();
		const total_price = formData.get('total_price');
		const cart_items_json = formData.get('cart_items');

		if (!delivery_option) {
			return { success: false, error: translate(locale, 'server.invalidDeliveryOption') };
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

		if (delivery_option === 'delivery' && !submittedAddress) {
			return { success: false, error: translate(locale, 'server.deliveryAddressRequired') };
		}

		if (delivery_option === 'delivery' && !submittedDeliveryTime) {
			return { success: false, error: translate(locale, 'server.deliveryTimeRequired') };
		}

		let cartItems = [];
		try {
			cartItems = JSON.parse(cart_items_json || '[]');
		} catch (e) {
			console.error('Failed to parse cart items:', e);
			return { success: false, error: translate(locale, 'server.invalidCart') };
		}

		if (!Array.isArray(cartItems) || cartItems.length === 0) {
			return { success: false, error: translate(locale, 'server.emptyCart') };
		}

		const items = cartItems.map((item) => {
			const addonIds = Array.isArray(item.customized_options?.addons)
				? item.customized_options.addons
						.map((a) => (typeof a === 'string' ? a : a.addon_id || a.id))
						.filter(Boolean)
				: [];

			return {
				productId: item.product_id || item.productId,
				productVariantId:
					item.product_variant_id ||
					item.productVariantId ||
					item.customized_options?.size?.variant_id ||
					null,
				quantity: Number(item.quantity) || 1,
				cakeSize: item.cake_size || item.customized_options?.size?.name || 'Standard',
				cakeFlavor: item.cake_flavor || item.customized_options?.flavor?.name || 'Standard',
				cakeColor: item.cake_color || item.customized_options?.color?.name || null,
				crownOption: item.crown_option || item.customized_options?.crown?.name || null,
				addEdibleGlitter: item.add_edible_glitter || item.customized_options?.glitter?.name || null,
				hasCakeTopper: Boolean(
					item.has_cake_topper || item.customized_options?.cake_topper?.selected
				),
				cakeTopperFee: item.cake_topper_fee || item.customized_options?.cake_topper?.price || 0,
				customizedOptions: {
					...(item.customized_options || {}),
					cake_text: item.cake_text,
					gift_card_text: item.gift_card_text,
					reference_image_url: item.reference_image_url || item.referenceImageUrl
				},
				selectedAddonIds: addonIds
			};
		});

		const payload = {
			customerName: customer_name,
			phoneNumber: phone_number,
			address: delivery_option === 'pickup' ? 'Pickup' : submittedAddress,
			email,
			deliveryOption: delivery_option,
			deliveryDate: String(delivery_date),
			deliveryTime: String(submittedDeliveryTime || '09:00'),
			expectedTotal: total_price ? Number(total_price) : undefined,
			items
		};

		try {
			const orderResult = await submitCheckoutOrder(payload, fetch);
			const orderId = orderResult?.id || orderResult?.data?.id || orderResult?.orderId;

			if (!orderId) {
				return { success: false, error: 'Pesanan berhasil dibuat, tetapi ID pesanan tidak ditemukan.' };
			}

			return { success: true, orderId };
		} catch (err) {
			console.error('Checkout error:', err);
			const message =
				err?.code === 'PRICE_CHANGED'
					? 'Harga produk telah diperbarui. Silakan refresh cart untuk melihat harga terbaru.'
					: err?.message || 'Gagal memproses pesanan. Silakan coba lagi.';

			return { success: false, error: message };
		}
	}
};
