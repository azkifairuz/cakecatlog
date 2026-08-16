export const ORDER_PAGE_SIZE = 24;
export const DASHBOARD_PAGE_SIZE = 12;

export const ORDER_LIST_SELECT = `
	id,
	order_number,
	customer_name,
	phone_number,
	email,
	delivery_option,
	delivery_date,
	delivery_time,
	address,
	status,
	amount,
	cake_price,
	delivery_fee,
	delivery_vehicle,
	cake_size,
	cake_color,
	cake_flavor,
	crown_option,
	add_edible_glitter,
	customized_options,
	quantity,
	cake_text,
	proof_of_transfer,
	created_at,
	products (name),
	order_items (
		id,
		product_id,
		quantity,
		cake_size,
		cake_text,
		cake_topper_fee,
		customized_options,
		dark_color_surcharge,
		estimated_subtotal,
		gift_card_text,
		has_cake_topper,
		reference_image_url,
		size_price,
		products (name)
	)
`;

const VALID_STATUSES = new Set(['Pending', 'Diproses', 'Selesai', 'Batal/Refund']);
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

export function parseOrderFilters(url, { singleDate = false, pageSize = ORDER_PAGE_SIZE } = {}) {
	const today = getJakartaDate();
	const q = String(url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const requestedStatus = String(url.searchParams.get('status') ?? 'All');
	const status = VALID_STATUSES.has(requestedStatus) ? requestedStatus : 'All';
	const dateType = url.searchParams.get('date_type') === 'created_at' ? 'created_at' : 'delivery_date';
	const page = normalizePage(url.searchParams.get('page'));
	let start;
	let end;

	if (singleDate) {
		const requestedDate = url.searchParams.get('date');
		start = requestedDate === '' ? '' : normalizeDate(requestedDate, today);
		end = start;
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
		date: singleDate ? start : undefined,
		page,
		pageSize
	};
}

function sanitizeSearch(value) {
	return value.replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function applyOrderFilters(query, filters, { forceStatus } = {}) {
	const status = forceStatus ?? filters.status;
	if (status && status !== 'All') query = query.eq('status', status);

	if (filters.start && filters.end) {
		if (filters.dateType === 'created_at') {
			query = query
				.gte('created_at', `${filters.start}T00:00:00+07:00`)
				.lte('created_at', `${filters.end}T23:59:59.999+07:00`);
		} else {
			query = query.gte('delivery_date', filters.start).lte('delivery_date', filters.end);
		}
	}

	const search = sanitizeSearch(filters.q);
	if (search) {
		const clauses = [`customer_name.ilike.%${search}%`, `email.ilike.%${search}%`];
		if (/^\d+$/.test(search)) clauses.push(`order_number.eq.${search}`);
		query = query.or(clauses.join(','));
	}

	return query;
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
			if (order.status === 'Diproses') summary.processing += 1;
			if (order.status === 'Selesai') {
				summary.completed += 1;
				summary.totalRevenue += Number(order.amount || 0);
			}
			return summary;
		},
		{ totalSales: 0, pending: 0, processing: 0, completed: 0, totalRevenue: 0 }
	);
}
