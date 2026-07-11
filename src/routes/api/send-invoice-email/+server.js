import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { generateInvoiceEmail, invoiceOrderSelect } from '$lib/server/invoice.js';

export async function POST({ request, locals: { supabase } }) {
	try {
		const { orderId } = await request.json();

		if (!orderId) {
			return json({ success: false, message: 'Order ID wajib diisi.' }, { status: 400 });
		}

		const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
		const emailFrom = env.EMAIL_FROM || process.env.EMAIL_FROM;
		const emailReplyTo = env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO;

		if (!resendApiKey || !emailFrom) {
			return json(
				{
					success: false,
					message: 'Konfigurasi email belum lengkap. Isi RESEND_API_KEY dan EMAIL_FROM di environment.'
				},
				{ status: 500 }
			);
		}

		const { data: order, error: dbError } = await supabase
			.from('orders')
			.select(invoiceOrderSelect)
			.eq('id', orderId)
			.single();

		if (dbError || !order) {
			return json({ success: false, message: 'Order tidak ditemukan.' }, { status: 404 });
		}

		if (!order.email) {
			return json({ success: false, message: 'Email pelanggan tidak tersedia.' }, { status: 400 });
		}

		const invoiceEmail = generateInvoiceEmail({
			...order,
			product_name: order.products?.name
		});

		const emailResponse = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${resendApiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: emailFrom,
				to: [order.email],
				subject: invoiceEmail.subject,
				html: invoiceEmail.html,
				text: invoiceEmail.text,
				reply_to: emailReplyTo
			})
		});

		const emailResult = await emailResponse.json().catch(() => ({}));

		if (!emailResponse.ok) {
			return json(
				{
					success: false,
					message: emailResult?.message || emailResult?.error?.message || 'Gagal mengirim invoice email.'
				},
				{ status: emailResponse.status }
			);
		}

		return json({ success: true, message: 'Invoice berhasil dikirim ke email pelanggan.' });
	} catch (err) {
		console.error('Send invoice email error:', err);
		return json({ success: false, message: 'Terjadi kesalahan: ' + err.message }, { status: 500 });
	}
}
