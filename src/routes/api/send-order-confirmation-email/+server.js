import { json } from '@sveltejs/kit';
import { sendOrderConfirmationEmail } from '$lib/server/order-confirmation-email.js';
import { normalizeSiteInfo } from '$lib/site-info.js';

const orderConfirmationSelect = `
	*,
	products (
		name
	),
	order_items (
		*,
		products (
			name
		)
	)
`;

export async function POST({ request, locals: { supabase } }) {
	try {
		const { orderId } = await request.json();

		if (!orderId) {
			return json({ success: false, message: 'Order ID wajib diisi.' }, { status: 400 });
		}

		const [{ data: order, error: orderError }, { data: siteInfo }] = await Promise.all([
			supabase.from('orders').select(orderConfirmationSelect).eq('id', orderId).single(),
			supabase.from('site_contact_info').select('*').eq('id', 'main').maybeSingle()
		]);

		if (orderError || !order) {
			return json({ success: false, message: 'Order tidak ditemukan.' }, { status: 404 });
		}

		const result = await sendOrderConfirmationEmail(order, normalizeSiteInfo(siteInfo));
		return json(result);
	} catch (err) {
		console.error('Send order confirmation email error:', err);
		return json({ success: false, message: 'Terjadi kesalahan: ' + err.message }, { status: 500 });
	}
}
