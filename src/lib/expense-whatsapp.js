export function canManageExpenseWhatsApp(admin) {
	return admin?.role === 'super_admin' || admin?.permissions?.includes('*') || admin?.permissions?.includes('expense.manage') || false;
}

export function normalizeExpenseSender(value) {
	let number = String(value ?? '').trim().replace(/[\s\-().,_]+/g, '').replace(/^\+/, '');
	if (!/^\d+$/.test(number)) throw new Error('Masukkan nomor WhatsApp yang valid, contoh 081234567890.');
	if (number.startsWith('0')) number = '62' + number.slice(1);
	else if (number.startsWith('8') && number.length >= 9 && number.length <= 13) number = '62' + number;
	if (number.length < 9 || number.length > 16) throw new Error('Panjang nomor WhatsApp tidak valid.');
	return number;
}
