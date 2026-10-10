import { error } from '@sveltejs/kit';
import { parseOrderFilters } from '$lib/server/admin-orders.js';
import { exportAdminOrders } from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export async function GET({ locals, url, fetch, cookies }) {
	const filters = parseOrderFilters(url);

	try {
		const response = await exportAdminOrders(
			{
				startDate: filters.start,
				endDate: filters.end,
				dateFilterType: filters.dateType,
				status: filters.status !== 'All' ? filters.status : undefined,
				q: filters.q || undefined
			},
			locals.adminToken,
			fetch
		);

		return response;
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Unable to export admin orders:', err);
		throw error(500, 'Data export belum dapat dibuat.');
	}
}
