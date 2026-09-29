import { error as httpError, fail } from '@sveltejs/kit';
import {
	DASHBOARD_PAGE_SIZE,
	getPagination,
	parseOrderFilters
} from '$lib/server/admin-orders.js';
import { adaptOrders } from '$lib/api/adapters.js';
import { normalizeTopProducts, normalizeStatusBreakdown, normalizeRepeatCustomers } from '$lib/analytics.js';
import {
	getAdminDashboard,
	getAdminRevenueSeries,
	getAdminRepeatOrders,
	updateAdminOrder,
	updateAdminOrderStatus,
	updateAdminOrderAmount,
	uploadAdminOrderReceipt
} from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, url, fetch, cookies }) => {
	const filters = parseOrderFilters(url, { pageSize: DASHBOARD_PAGE_SIZE, defaultAll: true });
	const groupBy = url.searchParams.get('groupBy') || 'day';

	const startDate = filters.start || undefined;
	const endDate = filters.end || undefined;
	const dateFilterType = startDate && endDate ? filters.dateType : undefined;

	try {
		const [dashboardData, revenueResult, repeatOrdersResult] = await Promise.all([
			getAdminDashboard(
				{
					startDate,
					endDate,
					dateFilterType
				},
				locals.adminToken,
				fetch
			),
			getAdminRevenueSeries(
				{
					startDate,
					endDate,
					dateFilterType,
					groupBy,
					status: filters.status === 'All' ? undefined : filters.status
				},
				locals.adminToken,
				fetch
			).catch((err) => {
				console.warn('Failed to load revenue series:', err);
				return [];
			}),
			getAdminRepeatOrders(
				{
					startDate,
					endDate,
					dateFilterType,
					limit: 5
				},
				locals.adminToken,
				fetch
			).catch((err) => {
				console.warn('Failed to load repeat orders:', err);
				return null;
			})
		]);

		const summary = dashboardData?.summary || {};
		const rawPendingOrders = dashboardData?.pendingOrders || [];
		const rawRecentOrders = dashboardData?.recentOrders || [];
		const pendingOrders = adaptOrders(rawPendingOrders);
		const recentOrders = adaptOrders(rawRecentOrders);
		const topProducts = normalizeTopProducts(dashboardData?.topProducts || []);
		const statusBreakdown = normalizeStatusBreakdown(dashboardData?.statusBreakdown || []);
		const repeatCustomersData = normalizeRepeatCustomers(repeatOrdersResult || summary);
		const revenueSeries = Array.isArray(revenueResult)
			? revenueResult
			: revenueResult?.items || revenueResult?.data || [];

		return {
			summary: {
				totalSales: summary?.totalOrders ?? 0,
				pending: summary?.pendingOrders ?? 0,
				processing: summary?.processingOrders ?? 0,
				completed: summary?.completedOrders ?? 0,
				cancelled: summary?.cancelledOrders ?? 0,
				totalRevenue: Number(summary?.completedRevenue ?? 0),
				grossRevenue: Number(summary?.grossRevenue ?? 0),
				averageOrderValue: Number(summary?.averageOrderValue ?? 0),
				deliveryExpenses: Number(summary?.deliveryExpenses ?? 0),
				operationalExpenses: Number(summary?.operationalExpenses ?? 0),
				totalExpenses: Number(summary?.totalExpenses ?? 0),
				profit: Number(summary?.profit ?? 0),
				repeatCustomers: Number(summary?.repeatCustomers ?? repeatCustomersData.repeatCustomers ?? 0),
				repeatOrders: Number(summary?.repeatOrders ?? repeatCustomersData.repeatOrders ?? 0),
				repeatOrderRate: Number(summary?.repeatOrderRate ?? repeatCustomersData.repeatOrderRate ?? 0)
			},
			pendingOrders,
			recentOrders,
			orders: pendingOrders,
			topProducts,
			statusBreakdown,
			repeatCustomersData,
			revenueSeries,
			groupBy,
			filters,
			pagination: getPagination(pendingOrders.length, filters)
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Unable to load admin dashboard:', err);
		throw httpError(500, 'Ringkasan penjualan belum dapat dimuat.');
	}
};

export const actions = {
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
