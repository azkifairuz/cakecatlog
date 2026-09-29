import { apiFetch, unwrapData } from './client.js';

const BASE = '/admin/notifications';

export async function getAdminNotifications(token = null, customFetch = null) {
	return unwrapData(await apiFetch(BASE, { method: 'GET', token }, customFetch));
}

export async function getAdminUnreadCount(token = null, customFetch = null) {
	return unwrapData(await apiFetch(`${BASE}/unread-count`, { method: 'GET', token }, customFetch));
}

export async function getAdminVapidPublicKey(token = null, customFetch = null) {
	return unwrapData(await apiFetch(`${BASE}/vapid-public-key`, { method: 'GET', token }, customFetch));
}

export async function saveAdminPushSubscription(subscription, token = null, customFetch = null) {
	return unwrapData(await apiFetch(`${BASE}/push-subscriptions`, {
		method: 'POST', token, body: subscription
	}, customFetch));
}

export async function deleteAdminPushSubscription(endpoint, token = null, customFetch = null) {
	return apiFetch(`${BASE}/push-subscriptions`, {
		method: 'DELETE', token, body: { endpoint }
	}, customFetch);
}

export async function markAdminNotificationRead(id, token = null, customFetch = null) {
	return unwrapData(await apiFetch(`${BASE}/${encodeURIComponent(id)}/read`, {
		method: 'PATCH', token
	}, customFetch));
}

export async function markAllAdminNotificationsRead(token = null, customFetch = null) {
	return unwrapData(await apiFetch(`${BASE}/read-all`, { method: 'PATCH', token }, customFetch));
}

export function openAdminNotificationStream(token, signal) {
	return apiFetch(`${BASE}/stream`, {
		method: 'GET', token, signal, headers: { Accept: 'text/event-stream' }
	});
}
