export const DEFAULT_SITE_INFO = {
	id: 'main',
	pickup_days: 'MONDAY - SUNDAY',
	pickup_store_hours: 'Store Hours: 09:00 - 18:00',
	pickup_manager_hours: 'Manager Hours: 09:00 - 20:00',
	address: 'Alamat toko belum diatur',
	whatsapp_number: '0812-3456-7890'
};

export function normalizeSiteInfo(siteInfo = {}) {
	return {
		...DEFAULT_SITE_INFO,
		...(siteInfo ?? {})
	};
}

export function getWhatsAppHref(number) {
	const normalized = number?.replace(/\D/g, '');
	return normalized ? `https://wa.me/${normalized}` : null;
}
