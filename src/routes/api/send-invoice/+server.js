import { json } from '@sveltejs/kit';
import { generateInvoiceText, invoiceOrderSelect } from '$lib/server/invoice.js';
import { WhatsAppGatewayError } from '$lib/server/whatsapp-gateway.js';
import { getWhatsAppGateway } from '$lib/server/whatsapp-gateway.server.js';

export async function POST({ request, locals }) {
	try {
		const { session } = await locals.safeGetSession();
		if (!session) {
			return json({ success: false, message: 'Sesi admin tidak valid.' }, { status: 401 });
		}

		const { orderId } = await request.json();

		if (!orderId) {
			return json({ success: false, message: 'Order ID wajib diisi.' }, { status: 400 });
		}

		// Fetch order data from Supabase
		const { data: order, error: dbError } = await locals.supabase
			.from('orders')
			.select(invoiceOrderSelect)
			.eq('id', orderId)
			.single();

		if (dbError || !order) {
			return json({ success: false, message: 'Order tidak ditemukan.' }, { status: 404 });
		}

		if (!order.phone_number) {
			return json({ success: false, message: 'Nomor HP pelanggan tidak tersedia.' }, { status: 400 });
		}

		// Generate invoice text
		const invoiceText = generateInvoiceText({
			...order,
			product_name: order.products?.name
		});

		await getWhatsAppGateway().sendTextMessage({
			to: order.phone_number,
			message: invoiceText
		});

		return json({ success: true, message: 'Invoice diterima Fonnte untuk diproses.' });
	} catch (err) {
		if (err instanceof WhatsAppGatewayError) {
			const status = err.status >= 400 && err.status < 600 ? err.status : 502;
			const messages = {
				NOT_CONNECTED: 'WhatsApp belum terhubung. Hubungkan perangkat melalui dashboard Fonnte.',
				INVALID_RECIPIENT: err.message,
				GATEWAY_TIMEOUT: err.message,
				SEND_FAILED: err.message,
				RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan WhatsApp. Coba lagi beberapa saat.',
				CONFIGURATION_ERROR: err.message,
				QUOTA_EXCEEDED: err.message,
				GATEWAY_UNAVAILABLE: err.message,
				VALIDATION_ERROR: err.message
			};
			return json(
				{ success: false, message: messages[err.code] || 'Fonnte sedang bermasalah. Periksa dashboard Fonnte sebelum mengirim ulang.' },
				{ status }
			);
		}

		console.error('Send invoice error:', err);
		return json({ success: false, message: 'Terjadi kesalahan saat mengirim invoice.' }, { status: 500 });
	}
}
