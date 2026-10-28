export const DEFAULT_SITE_INFO = {
	id: 'main',
	delivery_max_time: '18:00',
	pickup_days: 'MONDAY - SUNDAY',
	pickup_store_hours: 'Store Hours: 09:00 - 18:00',
	pickup_manager_hours: 'Manager Hours: 09:00 - 20:00',
	address: 'Alamat toko belum diatur',
	whatsapp_number: '6285883749714'
};

export function getDeliveryMaxTime(siteInfo = {}) {
	const value = siteInfo?.deliveryMaxTime ?? siteInfo?.delivery_max_time ?? '18:00';
	return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '18:00';
}

export function deliveryTimeHint(maxTime, locale = 'id') {
	return locale === 'en' ? 'Latest delivery time: ' + maxTime + ' WIB.' : 'Jam pengiriman maksimal pukul ' + maxTime + ' WIB.';
}

export function normalizeSiteInfo(siteInfo = {}) {
	const info = siteInfo ?? {};
	const result = { ...DEFAULT_SITE_INFO, ...info };
	for (const [snake, camel] of Object.entries({ pickup_days: 'pickupDays', pickup_store_hours: 'pickupStoreHours', pickup_manager_hours: 'pickupManagerHours', whatsapp_number: 'whatsappNumber' })) {
		result[snake] = info[snake] ?? info[camel] ?? DEFAULT_SITE_INFO[snake];
	}
	result.delivery_max_time = getDeliveryMaxTime(info);
	result.deliveryMaxTime = result.delivery_max_time;
	return result;
}

export function getWhatsAppHref(number) {
	const digits = String(number ?? '').replace(/\D/g, '');
	const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
	return normalized ? `https://wa.me/${normalized}` : null;
}
