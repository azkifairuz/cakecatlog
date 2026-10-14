import { error } from '@sveltejs/kit';
import { getOrderInvoice } from '$lib/api/order-invoice.js';

export async function load({ params, fetch, setHeaders }) {
	setHeaders({ 'cache-control': 'private, no-store' });
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.id)) error(404, 'Invoice tidak ditemukan.');
	let invoice;
	try { invoice = await getOrderInvoice(params.id, fetch); }
	catch (err) { error(err?.status === 404 ? 404 : 503, err?.status === 404 ? 'Invoice tidak ditemukan.' : 'Invoice belum dapat dimuat. Silakan coba lagi.'); }
	if (!invoice?.order?.id || !Array.isArray(invoice.items) || !invoice.totals || !Array.isArray(invoice.paymentAccounts)) error(502, 'Data invoice tidak lengkap. Silakan coba lagi.');
	return { invoice };
}
