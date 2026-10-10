export const ORDER_STATUS_OPTIONS = [
	{ value: 'Pending', label: 'Pending' },
	{ value: 'Confirmed', label: 'Dikonfirmasi' },
	{ value: 'Paid', label: 'Lunas' },
	{ value: 'Processing', label: 'Diproses' },
	{ value: 'Ready', label: 'Siap dikirim / diambil' },
	{ value: 'Delivered', label: 'Terkirim' },
	{ value: 'Completed', label: 'Selesai' },
	{ value: 'Cancelled', label: 'Batal / Refund' }
];

export function canonicalOrderStatus(status) {
	const aliases = { Diproses: 'Processing', Selesai: 'Completed', 'Batal/Refund': 'Cancelled' };
	return aliases[status] || ORDER_STATUS_OPTIONS.find((option) => option.value.toLowerCase() === String(status).toLowerCase())?.value || status;
}

export function orderStatusLabel(status) {
	return ORDER_STATUS_OPTIONS.find((option) => option.value === canonicalOrderStatus(status))?.label || status;
}

export const DELIVERY_PROOF_FIELDS = [
	{ name: 'cakeInCarPhoto', url: 'cakeInCarPhotoUrl', alias: 'cake_in_car_photo_url', label: 'Foto kue dalam mobil' },
	{ name: 'driverPhoto', url: 'driverPhotoUrl', alias: 'driver_photo_url', label: 'Foto driver' },
	{ name: 'licensePlatePhoto', url: 'licensePlatePhotoUrl', alias: 'license_plate_photo_url', label: 'Foto plat nomor' }
];

export function isDeliveryOrder(order) {
	return (order?.deliveryOption || order?.delivery_option || 'delivery') === 'delivery';
}

export function hasDeliveryProof(order) {
	return DELIVERY_PROOF_FIELDS.every(({ url, alias }) => Boolean((order?.[url] || order?.[alias] || '').trim()));
}

export function needsDeliveryProof(order, status) {
	return isDeliveryOrder(order) && ['Delivered', 'Completed'].includes(canonicalOrderStatus(status)) && !hasDeliveryProof(order);
}

export function validateProofFile(file) {
	if (!file || file.size === 0) return 'Pilih foto yang tidak kosong.';
	if (file.size > 5 * 1024 * 1024) return 'Ukuran foto maksimal 5 MB.';
	if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
		return 'Gunakan format JPG, JPEG, PNG, WEBP, atau GIF.';
	}
	return null;
}

// The browser sends photos directly to the backend, avoiding frontend-host body limits.
// The server action uses the same sequence for progressive enhancement.
export async function saveDeliveryProof({ id, status, files, retryStatus = false, token, upload, update }) {
	let savedOrder = null;
	try {
		if (!retryStatus) savedOrder = await upload(id, files, token);
		const order = status ? await update(id, canonicalOrderStatus(status), token) : savedOrder;
		return { order };
	} catch (error) {
		error.proofUploaded = Boolean(savedOrder) || retryStatus;
		error.savedOrder = savedOrder;
		throw error;
	}
}
