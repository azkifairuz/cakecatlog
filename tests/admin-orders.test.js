import assert from 'node:assert/strict';
import test from 'node:test';
import { getDashboardDateRange } from '../src/lib/admin-order-dates.js';
import {
	getJakartaDate,
	getPagination,
	parseOrderFilters,
	summarizeOrders
} from '../src/lib/server/admin-orders.js';

test('uses the Jakarta calendar date around UTC midnight', () => {
	assert.equal(getJakartaDate(new Date('2026-08-16T18:00:00Z')), '2026-08-17');
});

test('builds weekly, monthly, daily, and all dashboard ranges from today', () => {
	assert.deepEqual(getDashboardDateRange('all', '2026-08-17'), {
		start: '',
		end: ''
	});
	assert.deepEqual(getDashboardDateRange('daily', '2026-08-17'), {
		start: '2026-08-17',
		end: '2026-08-17'
	});
	assert.deepEqual(getDashboardDateRange('weekly', '2026-08-17'), {
		start: '2026-08-11',
		end: '2026-08-17'
	});
	assert.deepEqual(getDashboardDateRange('monthly', '2026-08-17'), {
		start: '2026-07-19',
		end: '2026-08-17'
	});
});

test('normalizes invalid order filters and limits search length', () => {
	const url = new URL(`https://example.com/admin/dashboard/orders?page=-5&status=unknown&date_type=other&q=${'x'.repeat(140)}`);
	const filters = parseOrderFilters(url, { singleDate: true });

	assert.equal(filters.page, 1);
	assert.equal(filters.status, 'All');
	assert.equal(filters.dateType, 'delivery_date');
	assert.equal(filters.q.length, 100);
	assert.equal(filters.date, filters.today);
});

test('treats an explicitly empty order date as all dates', () => {
	const filters = parseOrderFilters(
		new URL('https://example.com/admin/dashboard/orders?date='),
		{ singleDate: true }
	);

	assert.equal(filters.date, '');
	assert.equal(filters.start, '');
	assert.equal(filters.end, '');
});

test('handles defaultAll option when start and end parameters are omitted', () => {
	const filters = parseOrderFilters(
		new URL('https://example.com/admin/dashboard'),
		{ defaultAll: true, pageSize: 12 }
	);

	assert.equal(filters.start, '');
	assert.equal(filters.end, '');
	assert.equal(filters.date, '');
	assert.equal(filters.pageSize, 12);
});


test('normalizes a reversed dashboard date range', () => {
	const url = new URL('https://example.com/admin/dashboard?start=2026-08-20&end=2026-08-10&status=Selesai&page=2');
	const filters = parseOrderFilters(url, { pageSize: 12 });

	assert.equal(filters.start, '2026-08-10');
	assert.equal(filters.end, '2026-08-20');
	assert.equal(filters.status, 'Selesai');
	assert.equal(filters.page, 2);
	assert.equal(filters.pageSize, 12);
});

test('uses today when a dashboard range omits its end date', () => {
	const filters = parseOrderFilters(
		new URL('https://example.com/admin/dashboard?start=2000-01-01')
	);

	assert.equal(filters.start, '2000-01-01');
	assert.equal(filters.end, filters.today);
});

test('builds stable pagination metadata', () => {
	assert.deepEqual(getPagination(50, { page: 2, pageSize: 24 }), {
		page: 2,
		pageSize: 24,
		totalItems: 50,
		totalPages: 3,
		from: 25,
		to: 48
	});
});

test('summarizes order counts and completed revenue', () => {
	assert.deepEqual(
		summarizeOrders([
			{ status: 'Pending', amount: 100 },
			{ status: 'Diproses', amount: 200 },
			{ status: 'Selesai', amount: 300 },
			{ status: 'Selesai', amount: '450' }
		]),
		{
			totalSales: 4,
			pending: 1,
			processing: 1,
			completed: 2,
			totalRevenue: 750
		}
	);
});

test('parses date range filters for orders page (start and end)', () => {
	const url = new URL('https://example.com/admin/dashboard/orders?start=2026-09-01&end=2026-09-15&status=Confirmed&date_type=created_at&q=Dewi');
	const filters = parseOrderFilters(url);

	assert.equal(filters.start, '2026-09-01');
	assert.equal(filters.end, '2026-09-15');
	assert.equal(filters.status, 'Confirmed');
	assert.equal(filters.dateType, 'created_at');
	assert.equal(filters.q, 'Dewi');
	assert.equal(filters.pageSize, 24);
});

test('accepts both English backend statuses and Indonesian statuses', () => {
	for (const st of ['Pending', 'Confirmed', 'Paid', 'Processing', 'Ready', 'Delivered', 'Completed', 'Cancelled', 'Diproses', 'Selesai', 'Batal/Refund']) {
		const filters = parseOrderFilters(new URL(`https://example.com/admin/dashboard/orders?status=${st}`));
		assert.equal(filters.status, st);
	}
});

