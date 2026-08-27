export function slugify(text) {
	return String(text || '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export function buildFormUrl(origin = '', path = '/order-form', params = {}) {
	const base = origin.replace(/\/+$/, '');
	const cleanPath = path.startsWith('/') ? path : `/${path}`;
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null && String(value).trim() !== '') {
			searchParams.set(key, String(value).trim());
		}
	}

	const queryString = searchParams.toString();
	return `${base}${cleanPath}${queryString ? `?${queryString}` : ''}`;
}

export function buildWhatsAppShareMessage(siteInfo = {}, { formUrl = '', formTitle = '', productName = '' } = {}) {
	const storeName = 'dessertbyfir';
	let message = `Halo! 🎂\n\n`;

	if (productName) {
		message += `Pesan *${productName}* langsung lebih praktis tanpa ribet lewat form resmi *${storeName}*.\n\n`;
	} else if (formTitle) {
		message += `Silakan isi *${formTitle}* untuk memesan kue pilihan Anda di *${storeName}*.\n\n`;
	} else {
		message += `Pemesanan kue spesial di *${storeName}* kini bisa langsung lewat form berikut:\n\n`;
	}

	message += `👉 *Link Form Pemesanan:*\n${formUrl}\n\n`;
	message += `Pilih ukuran, rasa, kustomisasi, jadwal pickup/delivery, dan dapatkan konfirmasi pesanan secara instan. Terima kasih! ✨`;

	return message;
}
