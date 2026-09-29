import { getAdminActionLogs } from '$lib/api/admin.js';
import { handleAdminAuthError, isAuthError } from '$lib/api/auth.js';
import { adaptActionLogs } from '$lib/action-logs.js';
import { getJakartaDate } from '$lib/server/admin-orders.js';

export const load = async ({ locals, url, fetch, cookies }) => {
	const today = getJakartaDate();
	const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
	const pageSize = Math.max(1, Math.min(100, Number(url.searchParams.get('pageSize')) || 20));
	const menu = url.searchParams.get('menu') || 'All';
	const adminUserId = url.searchParams.get('adminUserId') || undefined;
	const start = url.searchParams.get('start') || '';
	const end = url.searchParams.get('end') || '';
	const q = (url.searchParams.get('q') || '').trim();

	const filters = {
		page,
		pageSize,
		menu,
		adminUserId,
		start,
		end,
		q,
		today
	};

	try {
		const result = await getAdminActionLogs(
			{
				page,
				pageSize,
				menu: menu !== 'All' ? menu : undefined,
				adminUserId,
				startDate: start || undefined,
				endDate: end || undefined,
				q: q || undefined
			},
			locals.adminToken,
			fetch
		);

		const rawItems = result?.items || result?.logs || result?.data?.items || [];
		const rawPagination = result?.pagination || result?.data?.pagination || {};
		const logs = adaptActionLogs(rawItems);
		const totalItems = Number(rawPagination.totalItems ?? rawPagination.totalCount ?? logs.length);
		const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
		const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
		const to = Math.min(page * pageSize, totalItems);

		return {
			logs,
			pagination: {
				page,
				pageSize,
				totalItems,
				totalPages,
				from,
				to
			},
			filters,
			error: null,
			isForbidden: false
		};
	} catch (err) {
		console.error('Failed to load action logs:', err);

		if (isAuthError(err)) {
			handleAdminAuthError(err, cookies);
		}

		const isForbidden = err?.status === 403 || err?.code === 'FORBIDDEN' || String(err?.message || '').toLowerCase().includes('permission');

		return {
			logs: [],
			pagination: {
				page: 1,
				pageSize: 20,
				totalItems: 0,
				totalPages: 1,
				from: 0,
				to: 0
			},
			filters,
			error: isForbidden
				? 'Akses Terbatas: Hanya Super Admin yang memiliki hak akses untuk melihat log audit aktivitas.'
				: err?.message || 'Gagal memuat log aktivitas dari server.',
			isForbidden
		};
	}
};
