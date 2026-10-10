import { deleteAdminPushSubscription } from '$lib/api/notifications.js';

export const NOTIFICATIONS_URL = '/admin/dashboard/notifications';
export {
	SOUND_COOLDOWN_MS, TOAST_BURST_MS, createSseParser, readSseStream,
	isNewNotification, shouldPlayNotificationSound, claimNotificationSound,
	urlBase64ToUint8Array, subscriptionPayload
} from './notification-utils.js';

export async function revokeAdminPushSubscription() {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
	const registration = await navigator.serviceWorker.getRegistration();
	const subscription = await registration?.pushManager?.getSubscription();
	if (!subscription) return;
	try {
		await deleteAdminPushSubscription(subscription.endpoint);
	} finally {
		await subscription.unsubscribe();
	}
}

export function getLastSoundStorage() {
	try {
		return localStorage;
	} catch {
		return null;
	}
}
