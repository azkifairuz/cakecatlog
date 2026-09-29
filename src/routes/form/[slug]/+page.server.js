import { error as httpError } from '@sveltejs/kit';
import { normalizeLocale, translate } from '$lib/i18n.svelte.js';
import { normalizePhoneNumber, PhoneNumberError } from '$lib/phone-number.js';
import { getCustomOrderFormData, submitSingleProductOrder } from '$lib/api/public.js';
import { uploadReferenceImage } from '$lib/api/upload.js';
import { adaptProducts } from '$lib/api/adapters.js';
import { normalizeSiteInfo } from '$lib/site-info.js';

export const load = async ({ params, fetch }) => {
	const { slug } = params;

	try {
		const result = await getCustomOrderFormData(slug, fetch);
		const customForm = result?.customForm || result?.data?.customForm || null;
		const rawProducts = result?.products || result?.data?.products || [];
		const globalAddons = result?.globalAddons || result?.data?.globalAddons || [];
		const siteInfo = normalizeSiteInfo(result?.siteInfo || result?.data?.siteInfo);
		const initialProductId = result?.initialProductId || result?.data?.initialProductId || '';
		const bannerText = result?.bannerText || result?.data?.bannerText || customForm?.title || '';

		return {
			customForm,
			products: adaptProducts(rawProducts),
			globalAddons,
			siteInfo,
			initialProductId,
			bannerText
		};
	} catch (err) {
		console.error('Failed to load custom order form:', err);
		if (err?.status === 404 || err?.message?.includes('not found')) {
			throw httpError(404, 'Form pemesanan tidak ditemukan atau sudah tidak aktif.');
		}
		throw httpError(500, 'Gagal memuat form pemesanan.');
	}
};

export const actions = {
	order: async ({ request, params, fetch }) => {
		const formData = await request.formData();
		const locale = normalizeLocale(formData.get('locale'));

		const product_id = formData.get('product_id');
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
		const quantity = Math.max(parseInt(formData.get('quantity'), 10) || 1, 1);
		const selected_size = String(formData.get('cake_size') || '').trim();
		const cake_text = String(formData.get('cake_text') || formData.get('add_on') || '').trim() || null;
		const gift_card_text = String(formData.get('gift_card_text') || '').trim() || null;
		const customized_options_json = formData.get('customized_options');
		const variantId = formData.get('product_variant_id') || null;

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

		let clientOptions = null;
		try {
			if (customized_options_json) {
				clientOptions = JSON.parse(customized_options_json);
			}
		} catch {
			clientOptions = null;
		}

		let reference_image_url = null;
		const file = formData.get('reference_image');
		if (file && file instanceof File && file.size > 0) {
			try {
				const uploadResult = await uploadReferenceImage(file, fetch);
				reference_image_url = uploadResult?.publicUrl || null;
			} catch (uploadErr) {
				console.warn('Failed to upload reference image:', uploadErr);
			}
		}

		const selectedAddonIds = Array.isArray(clientOptions?.addons)
			? clientOptions.addons.map((a) => (typeof a === 'string' ? a : a.addon_id || a.id)).filter(Boolean)
			: [];

		for (const [key, value] of formData.entries()) {
			if (key.startsWith('addon_') && value && typeof value === 'string' && !selectedAddonIds.includes(value)) {
				selectedAddonIds.push(value);
			}
		}

		const payload = {
			customerName: customer_name,
			phoneNumber: phone_number,
			email,
			deliveryOption: delivery_option,
			address: delivery_option === 'pickup' ? 'Pickup' : submittedAddress,
			deliveryDate: String(delivery_date),
			deliveryTime: String(submittedDeliveryTime || '09:00'),
			productId: String(product_id),
			productVariantId: variantId ? String(variantId) : clientOptions?.size?.variant_id || null,
			cakeSize: selected_size || clientOptions?.size?.name || 'Standard',
			cakeFlavor: clientOptions?.flavor?.name || formData.get('cake_flavor') || 'Standard',
			cakeColor: clientOptions?.color?.name || formData.get('cake_color') || null,
			crownOption: clientOptions?.crown?.name || formData.get('crown_option') || null,
			addEdibleGlitter: clientOptions?.glitter?.name || formData.get('add_edible_glitter') || null,
			cakeText: cake_text,
			giftCardText: gift_card_text,
			referenceImageUrl: reference_image_url,
			hasCakeTopper: Boolean(clientOptions?.cake_topper?.selected),
			cakeTopperFee: clientOptions?.cake_topper?.price || 0,
			customizedOptions: clientOptions,
			selectedAddonIds,
			orderFormSlug: params.slug,
			quantity
		};

		try {
			const orderResult = await submitSingleProductOrder(payload, fetch);
			const orderId = orderResult?.id || orderResult?.data?.id || orderResult?.orderId;

			if (!orderId) {
				return { success: false, error: 'Pesanan berhasil dibuat, tetapi ID pesanan tidak ditemukan.' };
			}

			return { success: true, orderId };
		} catch (err) {
			console.error('Custom form order creation error:', err);
			return { success: false, error: err?.message || 'Gagal menyimpan pesanan. Silakan coba lagi.' };
		}
	}
};
