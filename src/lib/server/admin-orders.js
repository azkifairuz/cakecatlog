import { canonicalOrderStatus } from '../order-delivery-proof.js';
export const ORDER_PAGE_SIZE = 24;
export const DASHBOARD_PAGE_SIZE = 12;

const VALID_STATUSES = new Set([
	'Pending',
	'Diproses',
	'Selesai',
	'Batal/Refund',
	'Confirmed',
	'Paid',
	'Processing',
	'Ready',
	'Delivered',
	'Completed',
	'Cancelled'
]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getJakartaDate(date = new Date()) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Jakarta',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);
}

function normalizeDate(value, fallback) {
	const candidate = String(value ?? '').trim();
	if (!DATE_PATTERN.test(candidate)) return fallback;
	const parsed = new Date(`${candidate}T00:00:00Z`);
	return Number.isNaN(parsed.getTime()) ? fallback : candidate;
}

function normalizePage(value) {
	const page = Number(value);
	return Number.isInteger(page) && page > 0 ? page : 1;
}

export function parseOrderFilters(url, { singleDate = false, pageSize = ORDER_PAGE_SIZE, defaultAll = false } = {}) {
	const today = getJakartaDate();
	const q = String(url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const requestedStatus = canonicalOrderStatus(String(url.searchParams.get('status') ?? 'All'));
	const status = VALID_STATUSES.has(requestedStatus) ? requestedStatus : 'All';
	const dateType = url.searchParams.get('date_type') === 'created_at' ? 'created_at' : 'delivery_date';
	const page = normalizePage(url.searchParams.get('page'));
	let start;
	let end;

	if (url.searchParams.has('start') || url.searchParams.has('end')) {
		const rawStart = url.searchParams.get('start');
		const rawEnd = url.searchParams.get('end');
		if (rawStart === '' && (rawEnd === '' || rawEnd === null)) {
			start = '';
			end = '';
		} else {
			start = normalizeDate(rawStart, today);
			end = normalizeDate(rawEnd, today);
			if (end < start) [start, end] = [end, start];
		}
	} else if (singleDate || (url.searchParams.has('date') && !url.searchParams.has('start') && !url.searchParams.has('end'))) {
		const requestedDate = url.searchParams.get('date');
		start = requestedDate === '' ? '' : normalizeDate(requestedDate, today);
		end = start;
	} else if (defaultAll) {
		start = '';
		end = '';
	} else {
		start = normalizeDate(url.searchParams.get('start'), today);
		end = normalizeDate(url.searchParams.get('end'), today);
		if (end < start) [start, end] = [end, start];
	}

	return {
		today,
		q,
		status,
		dateType,
		start,
		end,
		date: start === end ? start : undefined,
		page,
		pageSize
	};
}

export function getPagination(count, filters) {
	const totalItems = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalItems / filters.pageSize));
	const page = Math.min(filters.page, totalPages);
	const fromIndex = (page - 1) * filters.pageSize;

	return {
		page,
		pageSize: filters.pageSize,
		totalItems,
		totalPages,
		from: totalItems === 0 ? 0 : fromIndex + 1,
		to: Math.min(fromIndex + filters.pageSize, totalItems)
	};
}

export function getOrderPageRange(filters) {
	const from = (filters.page - 1) * filters.pageSize;
	return { from, to: from + filters.pageSize - 1 };
}

export function summarizeOrders(rows = []) {
	return rows.reduce(
		(summary, order) => {
			summary.totalSales += 1;
			if (order.status === 'Pending') summary.pending += 1;
			if (canonicalOrderStatus(order.status) === 'Processing') summary.processing += 1;
			if (canonicalOrderStatus(order.status) === 'Completed') {
				summary.completed += 1;
				summary.totalRevenue += Number(order.amount || 0);
			}
			return summary;
		},
		{ totalSales: 0, pending: 0, processing: 0, completed: 0, totalRevenue: 0 }
	);
}
