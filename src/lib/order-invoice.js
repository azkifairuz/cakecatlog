export async function copyInvoiceAccount(number, clipboard = globalThis.navigator?.clipboard) {
	if (typeof number !== 'string' || !number.trim()) throw new Error('Nomor rekening tidak tersedia.');
	if (!clipboard?.writeText) throw new Error('Salin otomatis belum tersedia. Pilih nomor rekening dan salin secara manual.');
	await clipboard.writeText(number);
}

export function formatInvoiceCurrency(amount) {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 2 }).format(Number(amount) || 0);
}
