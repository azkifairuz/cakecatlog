import { apiFetch, unwrapData } from './client.js';

export async function getExpenseWhatsAppConfig(token = null, customFetch = null) {
	return unwrapData(await apiFetch('/admin/expense-whatsapp/config', { method: 'GET', token }, customFetch));
}

export async function updateExpenseWhatsAppConfig(data, token = null, customFetch = null) {
	return unwrapData(await apiFetch('/admin/expense-whatsapp/config', { method: 'PUT', token, body: data }, customFetch));
}
