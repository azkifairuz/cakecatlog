import { apiFetch, unwrapData } from './client.js';

export async function getHomeData(customFetch = null) {
	const response = await apiFetch('/home', { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getHomeProducts(categoryOrId, customFetch = null) {
	const query = new URLSearchParams();
	if (categoryOrId && categoryOrId !== 'All') {
		query.set('category', categoryOrId);
	}
	const queryString = query.toString();
	const path = `/home/products${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getProducts(params = {}, customFetch = null) {
	const query = new URLSearchParams();
	if (params.page) query.set('page', String(params.page));
	if (params.pageSize) query.set('pageSize', String(params.pageSize));
	if (params.categoryId && params.categoryId !== 'All') query.set('categoryId', params.categoryId);
	if (params.category && params.category !== 'All') query.set('category', params.category);
	const searchTerm = params.q?.trim() || params.search?.trim();
	if (searchTerm) query.set('q', searchTerm);
	if (params.sortBy) query.set('sortBy', params.sortBy);
	if (params.sortOrder) query.set('sortOrder', params.sortOrder);

	const queryString = query.toString();
	const path = `/products${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getProductDetail(id, customFetch = null) {
	const response = await apiFetch(`/products/${id}`, { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getCategories(customFetch = null) {
	const response = await apiFetch('/categories', { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getCategoryDetail(slug, customFetch = null) {
	const response = await apiFetch(`/categories/${slug}`, { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getAddons(params = {}, customFetch = null) {
	const query = new URLSearchParams();
	if (params.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));
	const queryString = query.toString();
	const path = `/addons${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getSiteInfo(customFetch = null) {
	const response = await apiFetch('/site-info', { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getBanners(customFetch = null) {
	const response = await apiFetch('/banners', { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getOrderFormData(product = '', customFetch = null) {
	const query = new URLSearchParams();
	if (product) query.set('product', product);
	const queryString = query.toString();
	const path = `/order-form${queryString ? `?${queryString}` : ''}`;
	const response = await apiFetch(path, { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function getCustomOrderFormData(slug, customFetch = null) {
	const response = await apiFetch(`/order-forms/${slug}`, { method: 'GET' }, customFetch);
	return unwrapData(response);
}

export async function submitCheckoutOrder(payload, customFetch = null) {
	const response = await apiFetch(
		'/orders/checkout',
		{
			method: 'POST',
			body: payload
		},
		customFetch
	);
	return unwrapData(response);
}

export async function submitSingleProductOrder(payload, customFetch = null) {
	const response = await apiFetch(
		'/orders',
		{
			method: 'POST',
			body: payload
		},
		customFetch
	);
	return unwrapData(response);
}

export async function getOrderReceipt(id, customFetch = null) {
	const response = await apiFetch(`/orders/${id}/receipt`, { method: 'GET' }, customFetch);
	return unwrapData(response);
}
