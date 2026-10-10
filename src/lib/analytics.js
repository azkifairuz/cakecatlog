/**
 * Normalizes revenue series data returned from GET /admin/analytics/revenue
 * @param {Array<any>} series
 * @returns {Array<{ index: number, date: string, revenue: number, deliveryFee: number, total: number, orderCount: number }>}
 */
export function normalizeRevenueSeries(series = []) {
	return (Array.isArray(series) ? series : []).map((d, index) => {
		const revenue = Number(d.revenue || 0);
		const deliveryFee = Number(d.deliveryFee || 0);
		const orderCount = Number(d.orderCount || 0);
		const total = revenue + deliveryFee;
		return {
			index,
			date: String(d.date || ''),
			revenue,
			deliveryFee,
			total,
			orderCount
		};
	});
}

/**
 * Calculates aggregate totals for revenue, delivery fee, gross total, and orders count
 * @param {Array<any>} series
 * @returns {{ totalRevenue: number, totalDelivery: number, totalGross: number, totalOrders: number }}
 */
export function calculateRevenueSummary(series = []) {
	const normalized = normalizeRevenueSeries(series);
	return normalized.reduce(
		(acc, cur) => {
			acc.totalRevenue += cur.revenue;
			acc.totalDelivery += cur.deliveryFee;
			acc.totalGross += cur.total;
			acc.totalOrders += cur.orderCount;
			return acc;
		},
		{ totalRevenue: 0, totalDelivery: 0, totalGross: 0, totalOrders: 0 }
	);
}

/**
 * Builds query params for GET /admin/analytics/revenue
 * @param {{ startDate?: string, endDate?: string, dateFilterType?: string, groupBy?: string, status?: string }} params
 * @returns {string}
 */
export function buildRevenueQueryParams(params = {}) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);
	if (params.groupBy) query.set('groupBy', params.groupBy);
	if (params.status && params.status !== 'All') query.set('status', params.status);
	const str = query.toString();
	return str ? `?${str}` : '';
}

/**
 * Normalizes top products data
 * @param {Array<any>} items
 * @returns {Array<{ rank: number, rankFormatted: string, productId: string, productName: string, imageUrl: string|null, totalSold: number, totalRevenue: number, percentageOfMax: number }>}
 */
export function normalizeTopProducts(items = []) {
	const list = Array.isArray(items) ? items : [];
	const maxRevenue = Math.max(1, ...list.map((it) => Number(it.totalRevenue || it.total_revenue || 0)));
	const maxSold = Math.max(1, ...list.map((it) => Number(it.totalSold || it.total_sold || 0)));

	return list.map((it, idx) => {
		const rank = idx + 1;
		const rankFormatted = String(rank).padStart(2, '0');
		const productId = it.productId || it.product_id || it.id || '';
		const productName = it.productName || it.product_name || it.name || 'Produk Tanpa Nama';
		const imageUrl = it.imageUrl || it.image_url || it.primaryImageUrl || it.primary_image_url || null;
		const totalSold = Number(it.totalSold ?? it.total_sold ?? 0);
		const totalRevenue = Number(it.totalRevenue ?? it.total_revenue ?? 0);
		const percentageOfMax = Math.min(100, Math.max(8, Math.round((totalRevenue / maxRevenue) * 100)));

		return {
			rank,
			rankFormatted,
			productId,
			productName,
			imageUrl,
			totalSold,
			totalRevenue,
			percentageOfMax,
			maxSold
		};
	});
}

/**
 * Normalizes status breakdown items with colors and unified labels
 * @param {Array<any>} items
 * @returns {Array<{ status: string, originalStatus: string, label: string, count: number, percentage: number, color: string, bgClass: string, textClass: string, badgeBgClass: string, borderClass: string }>}
 */
export function normalizeStatusBreakdown(items = []) {
	const list = Array.isArray(items) ? items : [];

	return list.map((it) => {
		const originalStatus = String(it.status || '').trim();
		const count = Number(it.count || 0);
		const percentage = Number(it.percentage !== undefined ? it.percentage : 0);

		let label = originalStatus;
		let color = 'slate';
		let bgClass = 'bg-slate-400';
		let textClass = 'text-slate-700 dark:text-slate-300';
		let badgeBgClass = 'bg-slate-100 dark:bg-slate-800';
		let borderClass = 'border-slate-200 dark:border-slate-800';

		const lower = originalStatus.toLowerCase();
		if (lower === 'selesai' || lower === 'completed') {
			label = 'Selesai';
			color = 'emerald';
			bgClass = 'bg-emerald-500';
			textClass = 'text-emerald-700 dark:text-emerald-400';
			badgeBgClass = 'bg-emerald-50 dark:bg-emerald-950/40';
			borderClass = 'border-emerald-200 dark:border-emerald-800/40';
		} else if (lower === 'diproses' || lower === 'processing') {
			label = 'Diproses';
			color = 'sky';
			bgClass = 'bg-sky-500';
			textClass = 'text-sky-700 dark:text-sky-400';
			badgeBgClass = 'bg-sky-50 dark:bg-sky-950/40';
			borderClass = 'border-sky-200 dark:border-sky-800/40';
		} else if (lower === 'pending') {
			label = 'Pending';
			color = 'amber';
			bgClass = 'bg-amber-500';
			textClass = 'text-amber-700 dark:text-amber-400';
			badgeBgClass = 'bg-amber-50 dark:bg-amber-950/40';
			borderClass = 'border-amber-200 dark:border-amber-800/40';
		} else if (lower.includes('batal') || lower === 'cancelled' || lower === 'refund') {
			label = 'Batal/Refund';
			color = 'rose';
			bgClass = 'bg-rose-500';
			textClass = 'text-rose-700 dark:text-rose-400';
			badgeBgClass = 'bg-rose-50 dark:bg-rose-950/40';
			borderClass = 'border-rose-200 dark:border-rose-800/40';
		}

		return {
			status: originalStatus,
			originalStatus,
			label,
			count,
			percentage,
			color,
			bgClass,
			textClass,
			badgeBgClass,
			borderClass
		};
	});
}

/**
 * Normalizes repeat orders analytics payload
 * @param {any} data
 * @returns {{ repeatCustomers: number, repeatOrders: number, repeatOrderRate: number, totalOrders: number, customers: Array<{ phoneNumber: string, customerName: string, totalOrders: number, orderCountInRange: number, lastOrderAt: string, lastOrderNumber: number|string|null }> }}
 */
export function normalizeRepeatCustomers(data) {
	if (!data) {
		return {
			repeatCustomers: 0,
			repeatOrders: 0,
			repeatOrderRate: 0,
			totalOrders: 0,
			customers: []
		};
	}

	const rawCustomers = Array.isArray(data.customers)
		? data.customers
		: Array.isArray(data)
			? data
			: [];

	const customers = rawCustomers.map((c) => {
		const phoneNumber = String(c.phoneNumber || c.phone_number || '').trim();
		const customerName = String(c.customerName || c.customer_name || 'Pelanggan').trim();
		const totalOrders = Number(c.totalOrders ?? c.total_orders ?? 0);
		const orderCountInRange = Number(c.orderCountInRange ?? c.order_count_in_range ?? 0);
		const lastOrderAt = String(c.lastOrderAt || c.last_order_at || '');
		const lastOrderNumber = c.lastOrderNumber !== undefined ? c.lastOrderNumber : (c.last_order_number ?? null);

		return {
			phoneNumber,
			customerName,
			totalOrders,
			orderCountInRange,
			lastOrderAt,
			lastOrderNumber
		};
	});

	return {
		repeatCustomers: Number(data.repeatCustomers ?? data.repeat_customers ?? customers.length),
		repeatOrders: Number(data.repeatOrders ?? data.repeat_orders ?? 0),
		repeatOrderRate: Number(data.repeatOrderRate ?? data.repeat_order_rate ?? 0),
		totalOrders: Number(data.totalOrders ?? data.total_orders ?? 0),
		customers
	};
}
