export const DEFAULT_SITE_INFO = {
	id: 'main',
	pickup_days: 'MONDAY - SUNDAY',
	pickup_store_hours: 'Store Hours: 09:00 - 18:00',
	pickup_manager_hours: 'Manager Hours: 09:00 - 20:00',
	address: 'Alamat toko belum diatur',
	whatsapp_number: '6285883749714'
};

export function normalizeSiteInfo(siteInfo = {}) {
	return {
		...DEFAULT_SITE_INFO,
		...(siteInfo ?? {})
	};
}

export function getWhatsAppHref(number) {
	const digits = String(number ?? '').replace(/\D/g, '');
	const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
	return normalized ? `https://wa.me/${normalized}` : null;
}
