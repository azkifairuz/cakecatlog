import { cartOrderItem } from '$lib/cart-pricing.js';
import { setPriceNotice } from '$lib/price-notice.js';
import { hasCartVariantSelection } from '$lib/cart-variants.js';
import { normalizeLocale, translate } from '$lib/i18n.svelte.js';
import { normalizePhoneNumber, PhoneNumberError } from '$lib/phone-number.js';
import { getSiteInfo, submitCheckoutOrder } from '$lib/api/public.js';
import { fail } from '@sveltejs/kit';

export const load = async ({ fetch }) => {
	try { return { siteInfo: await getSiteInfo(fetch) }; }
	catch { return { siteInfo: null }; }
};

export const actions = {
	checkout: async ({ request, fetch, cookies }) => {
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

		if (cartItems.some((item) => !hasCartVariantSelection(item))) {
			return fail(422, { success: false, error: 'Pilih ukuran produk kembali. Keranjang lama belum menyimpan pilihan ukuran yang valid.' });
		}

		const items = cartItems.map(cartOrderItem);

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

			setPriceNotice(cookies, orderId, orderResult.pricingWarning, locale);
			return { success: true, orderId, pricingWarning: orderResult.pricingWarning };
		} catch (err) {
			console.error('Checkout error:', err);
			const message = err?.message || 'Gagal memproses pesanan. Silakan coba lagi.';

			return { success: false, error: message };
		}
	}
};
