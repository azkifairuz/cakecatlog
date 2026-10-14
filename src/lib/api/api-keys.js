import { apiFetch, unwrapData } from './client.js';

export async function generateAdminApiKey(username, password, customFetch = null) {
	return unwrapData(await apiFetch('/auth/api-key', {
		method: 'POST', body: { username, password }
	}, customFetch));
}

export async function deleteAdminApiKey(token, customFetch = null) {
	return apiFetch('/auth/api-key', { method: 'DELETE', token }, customFetch);
}
