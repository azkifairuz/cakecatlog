import { json } from '@sveltejs/kit';
import { WA_GATEWAY_API_KEY } from '$env/static/private';
import { PUBLIC_WA_GATEWAY_URL } from '$env/static/public';

function formatCurrency(amount) {
	return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function formatDate(dateString) {
	if (!dateString) return '-';
	return new Date(dateString).toLocaleDateString('id-ID', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

function generateInvoiceText(order) {
	const line = '━'.repeat(28);
	const dashes = '─'.repeat(28);

	return `🧁 *INVOICE - desertbyfir*
${line}

📋 *Detail Pesanan*
${dashes}
No. Order    : *#${order.order_number}*
Tanggal      : ${formatDate(order.created_at)}

👤 *Data Pelanggan*
${dashes}
Nama         : ${order.customer_name}
No. HP       : ${order.phone_number}

🎂 *Detail Produk*
${dashes}
Produk       : ${order.product_name || '-'}
Ukuran       : ${order.cake_size || '-'}
Jumlah       : ${order.quantity}
Catatan      : ${order.notes || '-'}

📅 *Pengiriman*
${dashes}
Tanggal      : ${formatDate(order.delivery_date)}
Waktu        : ${order.delivery_time || '-'}

💰 *Total Pembayaran*
${line}
*${formatCurrency(order.amount)}*
${line}

Terima kasih telah memesan di *desertbyfir* 🍰
Hubungi kami jika ada pertanyaan.`;
}

export async function POST({ request, locals: { supabase } }) {
	try {
		const { orderId } = await request.json();

		if (!orderId) {
			return json({ success: false, message: 'Order ID wajib diisi.' }, { status: 400 });
		}

		// Fetch order data from Supabase
		const { data: order, error: dbError } = await supabase
			.from('orders')
			.select(`
				*,
				products (
					name
				)
			`)
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

		// Send via WA Gateway
		const waResponse = await fetch(`${PUBLIC_WA_GATEWAY_URL}/api/send-message`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': WA_GATEWAY_API_KEY
			},
			body: JSON.stringify({
				nomor: order.phone_number,
				pesan: invoiceText
			})
		});

		const waResult = await waResponse.json();

		if (!waResult.success) {
			return json({ success: false, message: waResult.message }, { status: waResponse.status });
		}

		return json({ success: true, message: 'Invoice berhasil dikirim ke WhatsApp pelanggan.' });
	} catch (err) {
		console.error('Send invoice error:', err);
		return json({ success: false, message: 'Terjadi kesalahan: ' + err.message }, { status: 500 });
	}
}
