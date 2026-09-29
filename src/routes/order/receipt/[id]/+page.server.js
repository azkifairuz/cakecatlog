import { error } from '@sveltejs/kit';
import { getOrderReceipt } from '$lib/api/public.js';
import { normalizeSiteInfo } from '$lib/site-info.js';

export const load = async ({ params, fetch }) => {
	try {
		const result = await getOrderReceipt(params.id, fetch);
		const rawOrder = result?.order || result?.data?.order || result;
		const rawSiteInfo = result?.siteInfo || result?.data?.siteInfo || null;
		const rawItems = result?.items || result?.data?.items || rawOrder?.items || rawOrder?.order_items || [];

		if (!rawOrder || (!rawOrder.id && !rawOrder.orderNumber && !rawOrder.order_number)) {
			throw error(404, 'Pesanan tidak ditemukan.');
		}

		const order_items = (Array.isArray(rawItems) ? rawItems : []).map((item) => ({
			...item,
			products: {
				name: item.productName || item.products?.name || 'Produk'
			},
			quantity: Number(item.quantity) || 1,
			cake_size: item.cakeSize || item.cake_size || item.customizedOptions?.size?.name || '-',
			cake_flavor: item.cakeFlavor || item.cake_flavor || item.customizedOptions?.flavor?.name || '-',
			customized_options: item.customizedOptions || item.customized_options || null,
			estimated_subtotal: Number(item.estimatedSubtotal || item.estimated_subtotal || 0),
			estimated_unit_price: Number(item.estimatedUnitPrice || item.estimated_unit_price || item.priceAtOrder || 0),
			price_at_order: Number(item.priceAtOrder || item.price_at_order || 0)
		}));

		const order = {
			...rawOrder,
			order_number: rawOrder.orderNumber ?? rawOrder.order_number,
			customer_name: rawOrder.customerName ?? rawOrder.customer_name,
			phone_number: rawOrder.phoneNumber ?? rawOrder.phone_number,
			delivery_option: rawOrder.deliveryOption ?? rawOrder.delivery_option,
			delivery_date: rawOrder.deliveryDate ?? rawOrder.delivery_date,
			delivery_time: rawOrder.deliveryTime ?? rawOrder.delivery_time,
			created_at: rawOrder.createdAt ?? rawOrder.created_at,
			amount: Number(rawOrder.amount || rawOrder.estimatedSubtotal || 0),
			estimated_subtotal: Number(rawOrder.estimatedSubtotal || rawOrder.amount || 0),
			order_items,
			items: order_items,
			products: {
				name: rawOrder.productName || rawOrder.products?.name || (order_items[0]?.products?.name) || 'Produk'
			}
		};

		return {
			order,
			siteInfo: normalizeSiteInfo(rawSiteInfo)
		};
	} catch (err) {
		console.error('Failed to load order receipt:', err);
		if (err?.status === 404 || err?.message?.includes('tidak ditemukan') || err?.message?.includes('not found')) {
			throw error(404, 'Pesanan tidak ditemukan.');
		}
		throw error(err?.status || 500, err?.message || 'Gagal memuat receipt pesanan.');
	}
};
