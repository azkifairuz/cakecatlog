import { env } from '$env/dynamic/private';
import { formatCurrency, formatDate } from '$lib/server/invoice.js';
import { getWhatsAppHref, normalizeSiteInfo } from '$lib/site-info.js';

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function getOrderItems(order) {
	if (order.order_items?.length) {
		return order.order_items.map((item) => ({
			name: item.products?.name || 'Produk',
			quantity: item.quantity || 1,
			size: item.customized_options?.size?.name || item.cake_size || '-',
			subtotal: item.estimated_subtotal || (item.estimated_unit_price || item.price_at_order || 0) * (item.quantity || 1)
		}));
	}

	return [
		{
			name: order.products?.name || order.product_name || 'Produk',
			quantity: order.quantity || 1,
			size: order.customized_options?.size?.name || order.cake_size || '-',
			subtotal: order.estimated_subtotal || order.amount || 0
		}
	];
}

export function generateOrderConfirmationEmail(order, siteInfo) {
	const info = normalizeSiteInfo(siteInfo);
	const whatsappHref = getWhatsAppHref(info.whatsapp_number);
	const orderNumber = order.order_number ? `#${order.order_number}` : `#${String(order.id).slice(0, 8)}`;
	const items = getOrderItems(order);
	const itemsText = items.map((item) => `- ${item.name} (${item.quantity}x), ukuran ${item.size}`).join('\n');
	const itemsHtml = items
		.map(
			(item) => `
				<tr>
					<td style="padding:12px;border-bottom:1px solid #f1e7dc;">
						<strong>${escapeHtml(item.name)}</strong><br />
						<span style="color:#7a6a5f;font-size:13px;">Ukuran: ${escapeHtml(item.size)} · Qty: ${item.quantity}x</span>
					</td>
					<td style="padding:12px;border-bottom:1px solid #f1e7dc;text-align:right;white-space:nowrap;">${formatCurrency(item.subtotal)}</td>
				</tr>
			`
		)
		.join('');

	const subject = `Pesanan ${orderNumber} sudah kami terima`;
	const text = `Halo ${order.customer_name},

Terima kasih, pesanan Anda ${orderNumber} sudah kami terima dan statusnya masih Pending.
Admin sedang mengecek detail pesanan dan akan memprosesnya segera.

Detail singkat:
${itemsText}
Tanggal: ${formatDate(order.delivery_date)}
Jam: ${order.delivery_time || '-'}
Estimasi total: ${formatCurrency(order.amount)}

Jika ada pertanyaan, hubungi WhatsApp admin: ${info.whatsapp_number}
${whatsappHref || ''}
`;

	const html = `
		<div style="margin:0;padding:0;background:#fff8f1;font-family:Arial,Helvetica,sans-serif;color:#4a3b32;">
			<div style="max-width:640px;margin:0 auto;padding:32px 20px;">
				<div style="background:#ffffff;border:1px solid #f1e7dc;border-radius:18px;overflow:hidden;">
					<div style="background:#8c5a35;color:#ffffff;padding:24px 28px;">
						<p style="margin:0 0 6px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.85;">Pesanan diterima</p>
						<h1 style="margin:0;font-family:Georgia,serif;font-size:30px;font-style:italic;">dessertbyfir</h1>
					</div>

					<div style="padding:28px;">
						<h2 style="margin:0 0 12px;font-size:22px;color:#4a3b32;">Terima kasih, ${escapeHtml(order.customer_name)}</h2>
						<p style="margin:0 0 22px;color:#7a6a5f;line-height:1.6;">Pesanan ${escapeHtml(orderNumber)} sudah kami terima. Status pesanan Anda saat ini <strong>Pending</strong>, admin sedang mengecek detail pesanan dan akan memprosesnya segera.</p>

						<table style="width:100%;border-collapse:collapse;margin-bottom:22px;border:1px solid #f1e7dc;border-radius:12px;overflow:hidden;">
							<tbody>${itemsHtml}</tbody>
						</table>

						<div style="margin-bottom:22px;padding:16px;background:#fffbf7;border-radius:14px;">
							<p style="margin:0 0 8px;"><strong>Tanggal:</strong> ${formatDate(order.delivery_date)}</p>
							<p style="margin:0 0 8px;"><strong>Jam:</strong> ${escapeHtml(order.delivery_time || '-')}</p>
							<p style="margin:0;"><strong>Estimasi total:</strong> ${formatCurrency(order.amount)}</p>
						</div>

						<p style="margin:0 0 14px;color:#7a6a5f;">Butuh bantuan atau ingin konfirmasi detail? Hubungi admin via WhatsApp:</p>
						${whatsappHref ? `<a href="${escapeHtml(whatsappHref)}" style="display:inline-block;padding:13px 18px;background:#25d366;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:bold;">WhatsApp Admin ${escapeHtml(info.whatsapp_number)}</a>` : `<strong>${escapeHtml(info.whatsapp_number)}</strong>`}
					</div>
				</div>
			</div>
		</div>
	`;

	return { subject, html, text };
}

export async function sendOrderConfirmationEmail(order, siteInfo) {
	const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
	const emailFrom = env.EMAIL_FROM || process.env.EMAIL_FROM;
	const emailReplyTo = env.EMAIL_REPLY_TO || process.env.EMAIL_REPLY_TO;

	if (!order?.email || !resendApiKey || !emailFrom) {
		return { success: false, skipped: true };
	}

	const email = generateOrderConfirmationEmail(order, siteInfo);
	const response = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${resendApiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: emailFrom,
			to: [order.email],
			subject: email.subject,
			html: email.html,
			text: email.text,
			reply_to: emailReplyTo
		})
	});

	const result = await response.json().catch(() => ({}));
	if (!response.ok) {
		return {
			success: false,
			message: result?.message || result?.error?.message || 'Gagal mengirim email konfirmasi.'
		};
	}

	return { success: true };
}
