import { getAdminNotifications, getAdminVapidPublicKey } from '$lib/api/notifications.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, fetch, cookies }) => {
	let notifications = [];
	let error = null;
	let isForbidden = false;

	try {
		const result = await getAdminNotifications(locals.adminToken, fetch);
		notifications = Array.isArray(result) ? result : [];
	} catch (cause) {
		if (cause?.status !== 403) handleAdminAuthError(cause, cookies);
		isForbidden = cause?.status === 403;
		error = isForbidden
			? 'Anda tidak memiliki izin untuk melihat notifikasi.'
			: cause?.message || 'Notifikasi belum dapat dimuat.';
	}

	let vapidPublicKey = null;
	if (!isForbidden) {
		try {
			const result = await getAdminVapidPublicKey(locals.adminToken, fetch);
			vapidPublicKey = result?.publicKey || null;
		} catch (cause) {
			if (cause?.status !== 403) handleAdminAuthError(cause, cookies);
			// The notification list remains usable without a configured VAPID key.
		}
	}

	return { notifications, vapidPublicKey, error, isForbidden };
};
