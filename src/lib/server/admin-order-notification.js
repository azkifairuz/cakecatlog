import { formatCurrency, formatDate, getDeliveryOption } from './invoice.js';
import { normalizeSiteInfo } from '../site-info.js';

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function getOrderNumber(order) {
	return order?.order_number ? `#${order.order_number}` : `#${String(order?.id ?? '').slice(0, 8) || '-'}`;
}

function getOrderItems(order) {
	if (order?.order_items?.length) {
		return order.order_items.map((item) => ({
			name: item.products?.name || 'Produk',
			quantity: item.quantity || 1,
			size: item.customized_options?.size?.name || item.cake_size || '-',
			addons: Array.isArray(item.customized_options?.addons) ? item.customized_options.addons : [],
			subtotal: item.estimated_subtotal || (item.estimated_unit_price || item.price_at_order || 0) * (item.quantity || 1)
		}));
	}

	return [
		{
			name: order?.products?.name || order?.product_name || 'Produk',
			quantity: order?.quantity || 1,
			size: order?.customized_options?.size?.name || order?.cake_size || '-',
			addons: Array.isArray(order?.customized_options?.addons) ? order.customized_options.addons : [],
			subtotal: order?.estimated_subtotal || order?.amount || 0
		}
	];
}

export function generateAdminOrderNotification(order) {
	const orderNumber = getOrderNumber(order);
	const deliveryOption = getDeliveryOption(order);
	const deliveryLabel = deliveryOption === 'pickup' ? 'Pickup' : 'Delivery';
	const items = getOrderItems(order);
	const itemLines = items
		.map((item, index) => {
			const addons = item.addons.length
				? `\n   ${item.addons.map((addon) => `${addon.category}: ${addon.name}`).join('\n   ')}`
				: '';
			return `${index + 1}. ${item.name} (${item.quantity}x)
   Ukuran: ${item.size}${addons}
   Subtotal: ${formatCurrency(item.subtotal)}`;
		})
		.join('\n\n');

	const fulfillmentText =
		deliveryOption === 'pickup'
			? `Metode: ${deliveryLabel}
Tanggal: ${formatDate(order.delivery_date)}
Jam: ${order.delivery_time || '-'}`
			: `Metode: ${deliveryLabel}
Tanggal: ${formatDate(order.delivery_date)}
Jam: ${order.delivery_time || '-'}
Alamat: ${order.address || '-'}`;

	const subject = `Order baru masuk ${orderNumber}`;
	const text = `Order baru masuk ${orderNumber}

Customer:
Nama: ${order.customer_name || '-'}
No. HP: ${order.phone_number || '-'}
Email: ${order.email || '-'}

Pesanan:
${itemLines}

${fulfillmentText}

Total: ${formatCurrency(order.amount)}
Status: ${order.status || 'Pending'}`;

	const itemsHtml = items
		.map((item) => {
			const addons = item.addons.length
				? `<br /><span style="color:#7a6a5f;font-size:13px;">${item.addons.map((addon) => `${escapeHtml(addon.category)}: ${escapeHtml(addon.name)}`).join(' · ')}</span>`
				: '';
			return `
				<tr>
					<td style="padding:12px;border-bottom:1px solid #f1e7dc;">
						<strong>${escapeHtml(item.name)}</strong><br />
						<span style="color:#7a6a5f;font-size:13px;">Ukuran: ${escapeHtml(item.size)} · Qty: ${item.quantity}x</span>
						${addons}
					</td>
					<td style="padding:12px;border-bottom:1px solid #f1e7dc;text-align:right;white-space:nowrap;">${formatCurrency(item.subtotal)}</td>
				</tr>
			`;
		})
		.join('');
	const fulfillmentHtml =
		deliveryOption === 'pickup'
			? `
				<p style="margin:0 0 8px;"><strong>Metode:</strong> ${deliveryLabel}</p>
				<p style="margin:0 0 8px;"><strong>Tanggal:</strong> ${formatDate(order.delivery_date)}</p>
				<p style="margin:0;"><strong>Jam:</strong> ${escapeHtml(order.delivery_time || '-')}</p>
			`
			: `
				<p style="margin:0 0 8px;"><strong>Metode:</strong> ${deliveryLabel}</p>
				<p style="margin:0 0 8px;"><strong>Tanggal:</strong> ${formatDate(order.delivery_date)}</p>
				<p style="margin:0 0 8px;"><strong>Jam:</strong> ${escapeHtml(order.delivery_time || '-')}</p>
				<p style="margin:0;"><strong>Alamat:</strong><br />${escapeHtml(order.address || '-').replaceAll('\n', '<br />')}</p>
			`;

	const html = `
		<div style="margin:0;padding:0;background:#fff8f1;font-family:Arial,Helvetica,sans-serif;color:#4a3b32;">
			<div style="max-width:640px;margin:0 auto;padding:32px 20px;">
				<div style="background:#ffffff;border:1px solid #f1e7dc;border-radius:18px;overflow:hidden;">
					<div style="background:#8c5a35;color:#ffffff;padding:24px 28px;">
						<p style="margin:0 0 6px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.85;">Order baru masuk</p>
						<h1 style="margin:0;font-family:Georgia,serif;font-size:30px;font-style:italic;">${escapeHtml(orderNumber)}</h1>
					</div>
					<div style="padding:28px;">
						<div style="margin-bottom:22px;padding:16px;background:#fffbf7;border-radius:14px;">
							<p style="margin:0 0 8px;"><strong>Nama:</strong> ${escapeHtml(order.customer_name || '-')}</p>
							<p style="margin:0 0 8px;"><strong>No. HP:</strong> ${escapeHtml(order.phone_number || '-')}</p>
							<p style="margin:0;"><strong>Email:</strong> ${escapeHtml(order.email || '-')}</p>
						</div>
						<table style="width:100%;border-collapse:collapse;margin-bottom:22px;border:1px solid #f1e7dc;border-radius:12px;overflow:hidden;">
							<tbody>${itemsHtml}</tbody>
						</table>
						<div style="margin-bottom:22px;padding:16px;background:#fffbf7;border-radius:14px;">${fulfillmentHtml}</div>
						<div style="padding:18px;background:#4a3b32;color:#ffffff;border-radius:14px;">
							<p style="margin:0;display:flex;justify-content:space-between;font-size:20px;"><span>Total</span><strong>${formatCurrency(order.amount)}</strong></p>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	return { subject, text, html };
}

export async function sendAdminOrderNotification(order, siteInfo, options = {}) {
	const info = normalizeSiteInfo(siteInfo);
	const resendApiKey = process.env.RESEND_API_KEY;
	const emailFrom = process.env.EMAIL_FROM;
	const adminEmail = process.env.EMAIL_REPLY_TO || emailFrom;
	const notification = generateAdminOrderNotification(order);
	const fetchFn = options.fetchFn || fetch;
	const results = { whatsapp: { success: false, skipped: true }, email: { success: false, skipped: true } };

	if (info.whatsapp_number) {
		try {
			const gateway = options.gateway || (await import('./whatsapp-gateway.server.js')).getWhatsAppGateway();
			await gateway.sendTextMessage({ to: info.whatsapp_number, message: notification.text });
			results.whatsapp = { success: true };
		} catch (error) {
			results.whatsapp = { success: false, message: error.message };
		}
	}

	if (resendApiKey && emailFrom && adminEmail) {
		try {
			const response = await fetchFn('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${resendApiKey}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					from: emailFrom,
					to: [adminEmail],
					subject: notification.subject,
					html: notification.html,
					text: notification.text,
					reply_to: order.email || undefined
				})
			});
			const result = await response.json().catch(() => ({}));
			results.email = response.ok
				? { success: true }
				: {
						success: false,
						message: result?.message || result?.error?.message || 'Gagal mengirim email notifikasi admin.'
					};
		} catch (error) {
			results.email = { success: false, message: error.message };
		}
	}

	return {
		success: Boolean(results.whatsapp.success || results.email.success),
		results
	};
}
