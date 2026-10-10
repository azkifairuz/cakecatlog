import test from 'node:test';
import assert from 'node:assert/strict';
import {
	normalizeRevenueSeries,
	calculateRevenueSummary,
	buildRevenueQueryParams,
	normalizeTopProducts,
	normalizeStatusBreakdown,
	normalizeRepeatCustomers
} from '../src/lib/analytics.js';

test('normalizeRevenueSeries correctly formats raw backend revenue items', () => {
	const raw = [
		{ date: '2026-09-01', revenue: '1250000', deliveryFee: '75000', orderCount: 6 },
		{ date: '2026-09-02', revenue: 1850000, deliveryFee: 110000, orderCount: '9' },
		{ date: '2026-09-03', revenue: null, deliveryFee: undefined, orderCount: 0 }
	];

	const normalized = normalizeRevenueSeries(raw);

	assert.equal(normalized.length, 3);
	assert.equal(normalized[0].index, 0);
	assert.equal(normalized[0].revenue, 1250000);
	assert.equal(normalized[0].deliveryFee, 75000);
	assert.equal(normalized[0].total, 1325000);
	assert.equal(normalized[0].orderCount, 6);

	assert.equal(normalized[1].revenue, 1850000);
	assert.equal(normalized[1].deliveryFee, 110000);
	assert.equal(normalized[1].total, 1960000);
	assert.equal(normalized[1].orderCount, 9);

	assert.equal(normalized[2].revenue, 0);
	assert.equal(normalized[2].deliveryFee, 0);
	assert.equal(normalized[2].total, 0);
	assert.equal(normalized[2].orderCount, 0);
});

test('calculateRevenueSummary accurately aggregates cake revenue, delivery, gross total, and orders', () => {
	const series = [
		{ date: '2026-09-01', revenue: 1250000, deliveryFee: 75000, orderCount: 6 },
		{ date: '2026-09-02', revenue: 1850000, deliveryFee: 110000, orderCount: 9 }
	];

	const summary = calculateRevenueSummary(series);

	assert.equal(summary.totalRevenue, 3100000);
	assert.equal(summary.totalDelivery, 185000);
	assert.equal(summary.totalGross, 3285000);
	assert.equal(summary.totalOrders, 15);
});

test('calculateRevenueSummary handles empty or null input safely', () => {
	const summary = calculateRevenueSummary(null);
	assert.deepEqual(summary, {
		totalRevenue: 0,
		totalDelivery: 0,
		totalGross: 0,
		totalOrders: 0
	});
});

test('buildRevenueQueryParams generates expected URL search string', () => {
	const params = {
		startDate: '2026-09-01',
		endDate: '2026-09-07',
		dateFilterType: 'delivery_date',
		groupBy: 'day',
		status: 'Completed'
	};

	const query = buildRevenueQueryParams(params);
	assert.equal(
		query,
		'?startDate=2026-09-01&endDate=2026-09-07&dateFilterType=delivery_date&groupBy=day&status=Completed'
	);

	assert.equal(buildRevenueQueryParams({}), '');
	assert.equal(buildRevenueQueryParams({ status: 'All' }), '');
});

test('normalizeTopProducts maps fields and computes relative percentage for visual bar', () => {
	const items = [
		{
			productId: 'prod-1',
			productName: 'Triple Lily Veil',
			imageUrl: 'https://example.com/lily.jpg',
			totalSold: 6,
			totalRevenue: 4960000
		},
		{
			productId: 'prod-2',
			productName: 'Classic Redvelvet',
			imageUrl: null,
			totalSold: 4,
			totalRevenue: 400000
		}
	];

	const normalized = normalizeTopProducts(items);

	assert.equal(normalized.length, 2);
	assert.equal(normalized[0].rank, 1);
	assert.equal(normalized[0].rankFormatted, '01');
	assert.equal(normalized[0].productName, 'Triple Lily Veil');
	assert.equal(normalized[0].totalSold, 6);
	assert.equal(normalized[0].totalRevenue, 4960000);
	assert.equal(normalized[0].percentageOfMax, 100);

	assert.equal(normalized[1].rank, 2);
	assert.equal(normalized[1].rankFormatted, '02');
	assert.equal(normalized[1].totalSold, 4);
	assert.equal(normalized[1].totalRevenue, 400000);
	assert.ok(normalized[1].percentageOfMax < 100);
	assert.ok(normalized[1].percentageOfMax >= 8);
});

test('normalizeStatusBreakdown assigns semantic colors for Indonesian and English statuses', () => {
	const items = [
		{ status: 'Selesai', count: 5, percentage: 8.62 },
		{ status: 'Diproses', count: 4, percentage: 6.9 },
		{ status: 'Pending', count: 43, percentage: 74.14 },
		{ status: 'Batal/Refund', count: 6, percentage: 10.34 }
	];

	const normalized = normalizeStatusBreakdown(items);

	assert.equal(normalized.length, 4);
	assert.equal(normalized[0].label, 'Selesai');
	assert.equal(normalized[0].color, 'emerald');
	assert.equal(normalized[0].count, 5);
	assert.equal(normalized[0].percentage, 8.62);

	assert.equal(normalized[1].label, 'Diproses');
	assert.equal(normalized[1].color, 'sky');
	assert.equal(normalized[1].count, 4);

	assert.equal(normalized[2].label, 'Pending');
	assert.equal(normalized[2].color, 'amber');
	assert.equal(normalized[2].count, 43);

	assert.equal(normalized[3].label, 'Batal/Refund');
	assert.equal(normalized[3].color, 'rose');
	assert.equal(normalized[3].count, 6);
});

test('normalizeRepeatCustomers safely extracts customer metrics and list with phone formatting', () => {
	const rawPayload = {
		repeatCustomers: 7,
		repeatOrders: 24,
		repeatOrderRate: 41.38,
		totalOrders: 58,
		customers: [
			{
				phoneNumber: '085639027865',
				customerName: 'Nugi',
				totalOrders: 5,
				orderCountInRange: 2,
				lastOrderAt: '2026-06-09T16:40:00Z',
				lastOrderNumber: 5
			},
			{
				phone_number: '628123456789',
				customer_name: 'Budi',
				total_orders: 3,
				order_count_in_range: 1,
				last_order_at: '2026-06-10T10:00:00Z',
				last_order_number: 12
			}
		]
	};

	const normalized = normalizeRepeatCustomers(rawPayload);

	assert.equal(normalized.repeatCustomers, 7);
	assert.equal(normalized.repeatOrders, 24);
	assert.equal(normalized.repeatOrderRate, 41.38);
	assert.equal(normalized.totalOrders, 58);
	assert.equal(normalized.customers.length, 2);

	assert.equal(normalized.customers[0].customerName, 'Nugi');
	assert.equal(normalized.customers[0].phoneNumber, '085639027865');
	assert.equal(normalized.customers[0].totalOrders, 5);
	assert.equal(normalized.customers[0].orderCountInRange, 2);

	assert.equal(normalized.customers[1].customerName, 'Budi');
	assert.equal(normalized.customers[1].phoneNumber, '628123456789');
	assert.equal(normalized.customers[1].totalOrders, 3);
	assert.equal(normalized.customers[1].orderCountInRange, 1);

	// Edge case null test
	const empty = normalizeRepeatCustomers(null);
	assert.deepEqual(empty, {
		repeatCustomers: 0,
		repeatOrders: 0,
		repeatOrderRate: 0,
		totalOrders: 0,
		customers: []
	});
});
