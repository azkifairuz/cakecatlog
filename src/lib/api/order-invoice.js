import { apiFetch, unwrapData } from './client.js';

export async function getOrderInvoice(id, customFetch = null) {
	return unwrapData(await apiFetch(`/orders/${encodeURIComponent(id)}/invoice`, { method: 'GET' }, customFetch));
}
