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

		return json({ success: true, message: 'Invoice berhasil dikirim ke WhatsApp pelanggan.' });
	} catch (err) {
		if (err instanceof WhatsAppGatewayError) {
			const status = err.status >= 400 && err.status < 600 ? err.status : 502;
			const messages = {
				NOT_CONNECTED: 'WhatsApp belum terhubung. Scan QR terlebih dahulu di pengaturan WhatsApp.',
				INVALID_RECIPIENT: err.message,
				RECIPIENT_NOT_REGISTERED:
					'Nomor pelanggan tidak terdaftar di WhatsApp. Periksa kembali nomor pelanggan.',
				RECIPIENT_LOOKUP_FAILED:
					'Gateway gagal memeriksa nomor WhatsApp pelanggan. Coba lagi.',
				DELIVERY_FAILED:
					'Pesan ditolak atau koneksi terputus sebelum pesan diterima pelanggan.',
				DELIVERY_TIMEOUT:
					'Status pengiriman belum dapat dipastikan. Periksa WhatsApp sebelum mengirim ulang.',
				GATEWAY_TIMEOUT:
					'Gateway terlalu lama merespons. Periksa WhatsApp sebelum mengirim ulang.',
				SEND_FAILED: 'WhatsApp gagal memproses pesan.',
				RATE_LIMIT_EXCEEDED: 'Terlalu banyak permintaan WhatsApp. Coba lagi beberapa saat.',
				CONFIGURATION_ERROR: 'Konfigurasi WhatsApp gateway belum lengkap.',
				VALIDATION_ERROR: err.message
			};
			return json(
				{ success: false, message: messages[err.code] || 'WhatsApp gateway sedang bermasalah. Coba lagi nanti.' },
				{ status }
			);
		}

		console.error('Send invoice error:', err);
		return json({ success: false, message: 'Terjadi kesalahan saat mengirim invoice.' }, { status: 500 });
	}
}
