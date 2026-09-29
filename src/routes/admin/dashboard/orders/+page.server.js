import { error as httpError, fail } from '@sveltejs/kit';
import { parseOrderFilters } from '$lib/server/admin-orders.js';
import { adaptOrders, adaptProducts, adaptAddons } from '$lib/api/adapters.js';
import {
	getAdminOrders,
	getAdminOrder,
	createAdminOrder,
	updateAdminOrder,
	updateAdminOrderStatus,
	updateAdminOrderAmount,
	uploadAdminOrderReceipt,
	getAdminProducts,
	getAdminAddons
} from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, url, fetch, cookies }) => {
	const filters = parseOrderFilters(url, { defaultAll: true });

	const startDate = filters.start || undefined;
	const endDate = filters.end || undefined;
	const dateFilterType = startDate && endDate ? filters.dateType : undefined;

	try {
		const [result, productsResult, addonsResult] = await Promise.all([
			getAdminOrders(
				{
					page: filters.page,
					pageSize: filters.pageSize,
					status: filters.status !== 'All' ? filters.status : undefined,
					startDate,
					endDate,
					dateFilterType,
					q: filters.q || undefined
				},
				locals.adminToken,
				fetch
			),
			getAdminProducts({ pageSize: 100 }, locals.adminToken, fetch).catch((err) => {
				console.warn('Unable to load products for manual order creation:', err);
				return [];
			}),
			getAdminAddons(locals.adminToken, fetch).catch((err) => {
				console.warn('Unable to load addons for manual order creation:', err);
				return [];
			})
		]);

		const rawOrders = result?.items || result?.orders || [];
		const rawPagination = result?.pagination || {};
		const orders = adaptOrders(rawOrders);
		const totalCount = Number(rawPagination.totalItems ?? rawPagination.totalCount ?? orders.length);

		const rawProducts = Array.isArray(productsResult) ? productsResult : productsResult?.products || productsResult?.items || [];
		const rawAddons = Array.isArray(addonsResult) ? addonsResult : addonsResult?.addons || addonsResult?.items || [];
		const products = adaptProducts(rawProducts);
		const addons = adaptAddons(rawAddons);

		return {
			orders,
			products,
			addons,
			filters,
			pagination: {
				page: filters.page,
				pageSize: filters.pageSize,
				totalOrders: totalCount,
				totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
				from: totalCount === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1,
				to: Math.min(filters.page * filters.pageSize, totalCount)
			}
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Unable to load admin orders:', err);
		throw httpError(500, 'Daftar pesanan belum dapat dimuat.');
	}
};

export const actions = {
	createOrder: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const customerName = String(formData.get('customerName') || '').trim();
		const phoneNumber = String(formData.get('phoneNumber') || '').trim();
		const email = String(formData.get('email') || '').trim() || null;
		const deliveryOption = String(formData.get('deliveryOption') || 'delivery').trim().toLowerCase();
		const address = String(formData.get('address') || '').trim() || null;
		const deliveryDate = String(formData.get('deliveryDate') || '').trim();
		const deliveryTime = String(formData.get('deliveryTime') || '').trim();
		const deliveryVehicle = String(formData.get('deliveryVehicle') || '').trim() || null;
		const status = String(formData.get('status') || 'Pending').trim();
		const productId = String(formData.get('productId') || '').trim() || null;
		const productVariantId = String(formData.get('productVariantId') || '').trim() || null;
		const quantity = parseInt(formData.get('quantity') || '1', 10) || 1;
		const cakeText = String(formData.get('cakeText') || '').trim() || null;
		const giftCardText = String(formData.get('giftCardText') || '').trim() || null;
		const cakePrice = formData.get('cakePrice') ? parseFloat(formData.get('cakePrice')) : undefined;
		const deliveryFee = formData.get('deliveryFee') ? parseFloat(formData.get('deliveryFee')) : 0;
		const amount = formData.get('amount') ? parseFloat(formData.get('amount')) : (cakePrice || 0) + deliveryFee;
		const sendConfirmationEmail = formData.get('sendConfirmationEmail') === 'true' || formData.get('sendConfirmationEmail') === 'on';
		const selectedAddonIds = formData.getAll('selectedAddonIds').map((s) => String(s).trim()).filter(Boolean);

		if (!customerName) return fail(400, { success: false, error: 'Nama pemesan wajib diisi.' });
		if (!phoneNumber) return fail(400, { success: false, error: 'Nomor telepon pemesan wajib diisi.' });
		if (!productId) return fail(400, { success: false, error: 'Produk wajib dipilih.' });
		if (deliveryOption === 'delivery' && !address) {
			return fail(400, { success: false, error: 'Alamat pengiriman wajib diisi untuk opsi delivery.' });
		}
		if (!deliveryDate) {
			return fail(400, { success: false, error: 'Tanggal pengiriman / pickup wajib dipilih.' });
		}

		const payload = {
			customerName,
			customer_name: customerName,
			phoneNumber,
			phone_number: phoneNumber,
			email,
			deliveryOption: deliveryOption === 'pickup' ? 'pickup' : 'delivery',
			delivery_option: deliveryOption === 'pickup' ? 'pickup' : 'delivery',
			address: deliveryOption === 'pickup' ? (address || 'Pickup') : address,
			deliveryDate,
			delivery_date: deliveryDate,
			deliveryTime: deliveryTime || undefined,
			delivery_time: deliveryTime || undefined,
			pickupDate: deliveryOption === 'pickup' ? deliveryDate : undefined,
			pickup_date: deliveryOption === 'pickup' ? deliveryDate : undefined,
			pickupTime: deliveryOption === 'pickup' ? (deliveryTime || undefined) : undefined,
			pickup_time: deliveryOption === 'pickup' ? (deliveryTime || undefined) : undefined,
			deliveryVehicle: deliveryVehicle || undefined,
			delivery_vehicle: deliveryVehicle || undefined,
			status,
			productId,
			product_id: productId,
			productVariantId: productVariantId || undefined,
			product_variant_id: productVariantId || undefined,
			quantity,
			cakeText: cakeText || undefined,
			cake_text: cakeText || undefined,
			giftCardText: giftCardText || undefined,
			gift_card_text: giftCardText || undefined,
			selectedAddonIds,
			addon_ids: selectedAddonIds,
			cakePrice,
			cake_price: cakePrice,
			deliveryFee,
			delivery_fee: deliveryFee,
			amount,
			sendConfirmationEmail,
			send_confirmation_email: sendConfirmationEmail
		};

		try {
			await createAdminOrder(payload, locals.adminToken, fetch);
			return { success: true, message: 'Pesanan manual berhasil dibuat!' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create admin order error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal membuat pesanan manual.'
			});
		}
	},

	updateStatus: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const status = formData.get('status');

		if (!id || !status) return fail(400, { success: false, error: 'Missing data' });

		try {
			await updateAdminOrderStatus(id, status, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update status error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal mengubah status.' });
		}
	},

	updateAmount: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const amount = formData.get('amount');
		const cake_price = formData.get('cake_price');
		const delivery_fee = formData.get('delivery_fee');
		const delivery_vehicle = formData.get('delivery_vehicle');

		if (!id || !amount) return fail(400, { success: false, error: 'Missing data' });

		const payload = {
			amount: parseFloat(amount),
			cakePrice: cake_price ? parseFloat(cake_price) : undefined,
			deliveryFee: delivery_fee ? parseFloat(delivery_fee) : undefined,
			deliveryVehicle: delivery_vehicle ? String(delivery_vehicle) : undefined
		};

		try {
			await updateAdminOrderAmount(id, payload, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update amount error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal mengubah total harga.' });
		}
	},

	updateSchedule: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const deliveryOption = String(formData.get('delivery_option') || 'delivery').trim().toLowerCase();
		const date = String(formData.get('date') || '').trim();
		const time = String(formData.get('time') || '').trim();

		if (!id) return fail(400, { success: false, error: 'ID pesanan tidak valid.' });
		if (!date) return fail(400, { success: false, error: 'Tanggal wajib dipilih.' });
		if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
			return fail(400, { success: false, error: 'Format jam tidak valid (contoh: 14:00).' });
		}

		const payload = {
			deliveryOption: deliveryOption === 'pickup' ? 'pickup' : 'delivery',
			delivery_option: deliveryOption === 'pickup' ? 'pickup' : 'delivery',
			...(deliveryOption === 'pickup'
				? {
						pickupDate: date,
						pickup_date: date,
						pickupTime: time || undefined,
						pickup_time: time || undefined
				  }
				: {
						deliveryDate: date,
						delivery_date: date,
						deliveryTime: time || undefined,
						delivery_time: time || undefined
				  })
		};

		try {
			await updateAdminOrder(id, payload, locals.adminToken, fetch);
			return { success: true, message: 'Jadwal pesanan berhasil diperbarui.' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update schedule error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal mengubah jadwal pesanan.' });
		}
	},

	uploadReceipt: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const file = formData.get('receipt');

		if (!id || !file || file.size === 0) {
			return fail(400, { success: false, error: 'Missing file or ID' });
		}

		try {
			await uploadAdminOrderReceipt(id, file, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Upload receipt error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal mengunggah bukti transfer.' });
		}
	}
};
