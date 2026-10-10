import { canonicalOrderStatus } from '../order-delivery-proof.js';
import { apiFetch, unwrapData } from './client.js';

// ==========================================
// CATEGORIES
// ==========================================

export async function getAdminCategories(token = null, customFetch = null) {
	const response = await apiFetch('/admin/categories', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminCategory(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/categories/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminCategory(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/categories',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminCategory(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/categories/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminCategory(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/categories/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// ADDONS
// ==========================================

export async function getAdminAddons(token = null, customFetch = null) {
	const response = await apiFetch('/admin/addons', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminAddon(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/addons/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminAddon(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/addons',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminAddon(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/addons/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function toggleAdminAddon(id, isActive = undefined, token = null, customFetch = null) {
	const body = isActive !== undefined ? { isActive } : {};
	const response = await apiFetch(
		`/admin/addons/${id}/toggle`,
		{
			method: 'PATCH',
			token,
			body
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminAddon(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/addons/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// SITE INFO
// ==========================================

export async function getAdminSiteInfo(token = null, customFetch = null) {
	const response = await apiFetch('/admin/site-info', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function updateAdminSiteInfo(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/site-info',
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// BANNERS
// ==========================================

export async function getAdminBanners(token = null, customFetch = null) {
	const response = await apiFetch('/admin/banners', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminBanner(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/banners/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminBanner(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/banners',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminBanner(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/banners/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function bulkUpdateAdminBanners(banners, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/banners/bulk',
		{
			method: 'PUT',
			token,
			body: { banners }
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminBanner(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/banners/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// PRODUCTS
// ==========================================

export async function getAdminProducts(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.page) query.set('page', String(params.page));
	if (params.pageSize) query.set('pageSize', String(params.pageSize));
	if (params.q) query.set('q', params.q);
	if (params.categoryIds) {
		if (Array.isArray(params.categoryIds)) {
			params.categoryIds.forEach((c) => query.append('categoryIds', c));
		} else {
			query.set('categoryIds', params.categoryIds);
		}
	}

	const queryString = query.toString();
	const path = `/admin/products${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminProduct(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/products/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminProduct(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/products',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminProduct(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminProduct(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

export async function setAdminProductAvailability(id, isAvailable, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}/availability`,
		{
			method: 'PATCH',
			token,
			body: { isAvailable }
		},
		customFetch
	);
	return unwrapData(response);
}

export async function uploadAdminProductImages(id, images, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}/images`,
		{
			method: 'POST',
			token,
			body: { images }
		},
		customFetch
	);
	return unwrapData(response);
}

export async function setAdminPrimaryProductImage(id, imageId, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}/images/${imageId}/primary`,
		{
			method: 'PATCH',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminProductImage(id, imageId, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}/images/${imageId}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

export async function syncAdminProductVariants(id, variants, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}/variants`,
		{
			method: 'PUT',
			token,
			body: { variants }
		},
		customFetch
	);
	return unwrapData(response);
}

export async function syncAdminProductAddons(id, addonIds = [], newAddons = [], token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/products/${id}/addons`,
		{
			method: 'PUT',
			token,
			body: { addonIds, newAddons }
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// ORDER FORMS
// ==========================================

export async function getAdminOrderForms(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.page) query.set('page', String(params.page));
	if (params.pageSize) query.set('pageSize', String(params.pageSize));
	if (params.q) query.set('q', params.q);

	const queryString = query.toString();
	const path = `/admin/order-forms${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminOrderForm(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/order-forms/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminOrderForm(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/order-forms',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminOrderForm(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/order-forms/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function toggleAdminOrderFormStatus(id, isActive = undefined, token = null, customFetch = null) {
	const body = isActive !== undefined ? { isActive } : {};
	const response = await apiFetch(
		`/admin/order-forms/${id}/status`,
		{
			method: 'PATCH',
			token,
			body
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminOrderForm(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/order-forms/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// ORDERS
// ==========================================

export async function getAdminOrders(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.page) query.set('page', String(params.page));
	if (params.pageSize) query.set('pageSize', String(params.pageSize));
	if (params.status && params.status !== 'All') {
		if (Array.isArray(params.status)) {
			params.status.forEach((s) => query.append('status', s));
		} else {
			query.set('status', params.status);
		}
	}
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);
	if (params.q) query.set('q', params.q);

	const queryString = query.toString();
	const path = `/admin/orders${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminOrder(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/orders/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminOrder(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/orders',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminOrder(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/orders/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminOrderStatus(id, status, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/orders/${id}/status`,
		{
			method: 'PATCH',
			token,
			body: { status: canonicalOrderStatus(status) }
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminOrderAmount(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/orders/${id}/amount`,
		{
			method: 'PATCH',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function uploadAdminOrderReceipt(id, file, token = null, customFetch = null) {
	const formData = new FormData();
	formData.append('file', file);

	const response = await apiFetch(
		`/admin/orders/${id}/receipt`,
		{
			method: 'POST',
			token,
			body: formData
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminOrderReceipt(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/orders/${id}/receipt`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

export async function exportAdminOrders(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);
	if (params.status && params.status !== 'All') {
		if (Array.isArray(params.status)) {
			params.status.forEach((s) => query.append('status', s));
		} else {
			query.set('status', params.status);
		}
	}
	if (params.q) query.set('q', params.q);

	const queryString = query.toString();
	const path = `/admin/orders/export${queryString ? `?${queryString}` : ''}`;
	return apiFetch(path, { method: 'GET', token }, customFetch);
}

export async function sendAdminInvoiceWhatsApp(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/orders/${id}/send-invoice/whatsapp`,
		{
			method: 'POST',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

export async function sendAdminInvoiceEmail(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/orders/${id}/send-invoice/email`,
		{
			method: 'POST',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

export async function sendAdminOrderConfirmationEmail(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/orders/${id}/send-confirmation-email`,
		{
			method: 'POST',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// DASHBOARD & ANALYTICS
// ==========================================

export async function getAdminDashboard(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);

	const queryString = query.toString();
	const path = `/admin/dashboard${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminAnalyticsSummary(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);

	const queryString = query.toString();
	const path = `/admin/analytics/summary${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminRevenueSeries(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);
	if (params.groupBy) query.set('groupBy', params.groupBy);
	if (params.status) query.set('status', params.status);

	const queryString = query.toString();
	const path = `/admin/analytics/revenue${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminStatusBreakdown(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);

	const queryString = query.toString();
	const path = `/admin/analytics/status-breakdown${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminTopProducts(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);
	if (params.limit) query.set('limit', String(params.limit));

	const queryString = query.toString();
	const path = `/admin/analytics/top-products${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminDeliveryBreakdown(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);

	const queryString = query.toString();
	const path = `/admin/analytics/delivery${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminRepeatOrders(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.dateFilterType) query.set('dateFilterType', params.dateFilterType);
	if (params.limit) query.set('limit', String(params.limit));

	const queryString = query.toString();
	const path = `/admin/analytics/repeat-orders${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

// ==========================================
// WHATSAPP GATEWAY
// ==========================================

export async function getAdminWhatsAppStatus(token = null, customFetch = null) {
	const response = await apiFetch('/admin/whatsapp/status', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminWhatsAppQr(token = null, customFetch = null) {
	const response = await apiFetch('/admin/whatsapp/qr', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function logoutAdminWhatsApp(token = null, customFetch = null) {
	const response = await apiFetch('/admin/whatsapp/logout', { method: 'POST', token }, customFetch);
	return unwrapData(response);
}

// ==========================================
// INVOICE TEMPLATE
// ==========================================

export async function getAdminInvoiceTemplate(token = null, customFetch = null) {
	const response = await apiFetch('/admin/invoice-template', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function updateAdminInvoiceTemplate(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/invoice-template',
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function getAdminInvoiceTemplateVariables(token = null, customFetch = null) {
	const response = await apiFetch('/admin/invoice-template/variables', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

// ==========================================
// ACTION LOGS
// ==========================================

export async function getAdminActionLogs(params = {}, token = null, customFetch = null) {
	const query = new URLSearchParams();
	if (params.page) query.set('page', String(params.page));
	if (params.pageSize) query.set('pageSize', String(params.pageSize));
	if (params.menu && params.menu !== 'All') query.set('menu', params.menu);
	if (params.adminUserId) query.set('adminUserId', params.adminUserId);
	if (params.startDate) query.set('startDate', params.startDate);
	if (params.endDate) query.set('endDate', params.endDate);
	if (params.q) query.set('q', params.q);

	const queryString = query.toString();
	const path = `/admin/action-logs${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

// ==========================================
// ROLES & PERMISSIONS
// ==========================================

export async function getAdminMenus(token = null, customFetch = null) {
	return unwrapData(await apiFetch('/admin/menus', { method: 'GET', token }, customFetch));
}

export async function createAdminMenu(data, token = null, customFetch = null) {
	return unwrapData(await apiFetch('/admin/menus', { method: 'POST', token, body: data }, customFetch));
}

export async function updateAdminMenu(id, data, token = null, customFetch = null) {
	return unwrapData(await apiFetch(`/admin/menus/${encodeURIComponent(id)}`, { method: 'PUT', token, body: data }, customFetch));
}

export async function deleteAdminMenu(id, token = null, customFetch = null) {
	return unwrapData(await apiFetch(`/admin/menus/${encodeURIComponent(id)}`, { method: 'DELETE', token }, customFetch));
}

export async function getAdminRoleMenus(id, token = null, customFetch = null) {
	return unwrapData(await apiFetch(`/admin/roles/${encodeURIComponent(id)}/menus`, { method: 'GET', token }, customFetch));
}

export async function updateAdminRoleMenus(id, menuIds, token = null, customFetch = null) {
	return unwrapData(await apiFetch(`/admin/roles/${encodeURIComponent(id)}/menus`, { method: 'PUT', token, body: { menuIds } }, customFetch));
}

export async function getAdminPermissions(token = null, customFetch = null) {
	const response = await apiFetch('/admin/permissions', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminRoles(token = null, customFetch = null) {
	const response = await apiFetch('/admin/roles', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminRole(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/roles/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminRole(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/roles',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminRole(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/roles/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminRole(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/roles/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

export async function getAdminRolePermissions(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/roles/${id}/permissions`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function updateAdminRolePermissions(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/roles/${id}/permissions`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// EMPLOYEES
// ==========================================

export async function getAdminEmployees(token = null, customFetch = null) {
	const response = await apiFetch('/admin/employees', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminEmployee(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/employees/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminEmployee(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/employees',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminEmployee(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/employees/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function resetAdminEmployeePassword(id, newPassword, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/employees/${id}/password`,
		{
			method: 'PATCH',
			token,
			body: { newPassword }
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminEmployee(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/employees/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// EXPENSE CATEGORIES
// ==========================================

export async function getAdminExpenseCategories(token = null, customFetch = null) {
	const response = await apiFetch('/admin/expense-categories', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminExpenseCategory(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/expense-categories/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminExpenseCategory(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/expense-categories',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminExpenseCategory(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/expense-categories/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminExpenseCategory(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/expense-categories/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}

// ==========================================
// EXPENSES
// ==========================================

export async function getAdminExpenses(token = null, customFetch = null) {
	const response = await apiFetch('/admin/expenses', { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function getAdminExpense(id, token = null, customFetch = null) {
	const response = await apiFetch(`/admin/expenses/${id}`, { method: 'GET', token }, customFetch);
	return unwrapData(response);
}

export async function createAdminExpense(data, token = null, customFetch = null) {
	const response = await apiFetch(
		'/admin/expenses',
		{
			method: 'POST',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function updateAdminExpense(id, data, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/expenses/${id}`,
		{
			method: 'PUT',
			token,
			body: data
		},
		customFetch
	);
	return unwrapData(response);
}

export async function deleteAdminExpense(id, token = null, customFetch = null) {
	const response = await apiFetch(
		`/admin/expenses/${id}`,
		{
			method: 'DELETE',
			token
		},
		customFetch
	);
	return unwrapData(response);
}




export async function uploadAdminOrderDeliveryProof(id, files, token = null, customFetch = null) {
	const formData = new FormData();
	for (const name of ['cakeInCarPhoto', 'driverPhoto', 'licensePlatePhoto']) {
		formData.append(name, files[name]);
	}
	return unwrapData(await apiFetch(`/admin/orders/${id}/delivery-proof`, {
		method: 'POST', token, body: formData
	}, customFetch));
}
