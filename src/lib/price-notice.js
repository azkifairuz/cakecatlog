const COOKIE = 'price_change_notice';
const TTL = 300;

export function validPriceWarning(value) {
	return value?.code === 'PRICE_UPDATED' &&
		Number.isFinite(value.previousTotal) && value.previousTotal >= 0 &&
		Number.isFinite(value.newTotal) && value.newTotal >= 0;
}

export function setPriceNotice(cookies, orderId, warning, locale = 'id') {
	if (!cookies || !validPriceWarning(warning)) return;
	try {
		cookies.set(COOKIE, JSON.stringify({ orderId, warning, locale: locale === 'en' ? 'en' : 'id', at: Date.now() }), {
			path: `/order/receipt/${encodeURIComponent(orderId)}`, httpOnly: true, sameSite: 'lax', maxAge: TTL
		});
	} catch {
		// An advisory notice must never turn a successfully created order into a failure.
		console.warn('Unable to save price update notice');
	}
}

export function takePriceNotice(cookies, orderId, actualTotal) {
	if (!cookies) return null;
	try {
		const raw = cookies.get(COOKIE);
		if (!raw) return null;
		const notice = JSON.parse(raw);
		if (notice.orderId !== orderId) return null;
		cookies.delete(COOKIE, { path: `/order/receipt/${encodeURIComponent(orderId)}` });
		if (!validPriceWarning(notice.warning) || !Number.isFinite(notice.at) ||
			Date.now() - notice.at > TTL * 1000 || notice.at > Date.now() ||
			Math.abs(notice.warning.newTotal - Number(actualTotal)) > 0.01) return null;
		return { ...notice.warning, locale: notice.locale === 'en' ? 'en' : 'id' };
	} catch { return null; }
}

export function priceWarningMessage(warning, locale = 'id', completed = false) {
	const money = value => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID', {
		style: 'currency', currency: 'IDR', maximumFractionDigits: 2
	}).format(value);
	if (!validPriceWarning(warning)) return '';
	const previous = money(warning.previousTotal);
	const current = money(warning.newTotal);
	return locale === 'en'
		? `Your order price was updated from ${previous} to ${current}. ${completed ? 'Your order was placed using the latest price.' : 'You can continue with the latest price.'}`
		: `Harga pesanan diperbarui dari ${previous} menjadi ${current}. ${completed ? 'Pesanan Anda sudah dibuat menggunakan harga terbaru.' : 'Anda tetap bisa melanjutkan dengan harga terbaru.'}`;
}
