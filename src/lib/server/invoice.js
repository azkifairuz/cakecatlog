export const invoiceOrderSelect = `
	*,
	order_items (
		*,
		products (
			name
		)
	)
`;

export function formatCurrency(amount) {
	return new Intl.NumberFormat('id-ID', {
		style: 'currency',
		currency: 'IDR',
		maximumFractionDigits: 0
	}).format(Number(amount) || 0);
}

export function formatDate(dateString) {
	if (!dateString) return '-';

	return new Date(dateString).toLocaleDateString('id-ID', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

export function getDeliveryOption(order) {
	return order.delivery_option === 'pickup' ? 'pickup' : 'delivery';
}

export function getDeliveryLabel(order) {
	return getDeliveryOption(order) === 'pickup' ? 'Pickup' : 'Delivery';
}

export function getVehicleLabel(order) {
	if (!order.delivery_vehicle) return '';
	return order.delivery_vehicle === 'Car' ? 'Mobil' : 'Motor';
}

function getInvoiceItems(order) {
	if (order.order_items && order.order_items.length > 0) {
		return order.order_items.map((item, index) => ({
			number: index + 1,
			name: item.products?.name || 'Kue',
			quantity: item.quantity || 1,
			size: item.cake_size || '-',
			flavor: item.cake_flavor || '-',
			text: item.cake_text || '-',
			subtotal: item.estimated_subtotal || (item.estimated_unit_price || item.price_at_order || 0) * (item.quantity || 1)
		}));
	}

	return [
		{
			number: 1,
			name: order.product_name || 'Kue',
			quantity: order.quantity || 1,
			size: order.cake_size || '-',
			flavor: order.cake_flavor || '-',
			text: order.cake_text || '-',
			subtotal: order.estimated_subtotal || order.amount || 0
		}
	];
}

export function generateInvoiceText(order) {
	const line = '━'.repeat(28);
	const dashes = '─'.repeat(28);
	const deliveryOption = getDeliveryOption(order);
	const deliveryLabel = getDeliveryLabel(order);
	const vehicleText = getVehicleLabel(order);

	const itemsText = getInvoiceItems(order)
		.map((item) => {
			return `${item.number}. *${item.name}* (${item.quantity}x)
   Ukuran: ${item.size}
   Rasa: ${item.flavor}
   Tulisan: ${item.text}`;
		})
		.join('\n\n');

	const fulfillmentDetails =
		deliveryOption === 'pickup'
			? `Metode       : ${deliveryLabel}
Tanggal      : ${formatDate(order.delivery_date)}
Waktu        : ${order.delivery_time || '-'}
Keterangan   : Pickup di toko`
			: `Metode       : ${deliveryLabel}
Tanggal      : ${formatDate(order.delivery_date)}
Waktu        : ${order.delivery_time || '-'}
Alamat       : ${order.address || '-'}`;

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
Email        : ${order.email || '-'}

🎂 *Detail Produk*
${dashes}
${itemsText}

📅 *${deliveryOption === 'pickup' ? 'Pickup' : 'Pengiriman'}*
${dashes}
${fulfillmentDetails}

💰 *Total Pembayaran*
${line}
Harga Kue    : ${formatCurrency(order.cake_price || order.amount)}
Ongkos Kirim : ${formatCurrency(order.delivery_fee || 0)} ${vehicleText ? `(${vehicleText})` : ''}
${dashes}
*TOTAL       : ${formatCurrency(order.amount)}*
${line}

Terima kasih telah memesan di *desertbyfir* 🍰
Hubungi kami jika ada pertanyaan.`;
}

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

export function generateInvoiceEmail(order) {
	const deliveryOption = getDeliveryOption(order);
	const deliveryLabel = getDeliveryLabel(order);
	const vehicleText = getVehicleLabel(order);
	const items = getInvoiceItems(order);
	const subject = `Invoice desertbyfir #${order.order_number}`;

	const itemsHtml = items
		.map(
			(item) => `
				<tr>
					<td style="padding:12px;border-bottom:1px solid #f1e7dc;">
						<strong>${item.number}. ${escapeHtml(item.name)}</strong><br />
						<span style="color:#7a6a5f;font-size:13px;">Ukuran: ${escapeHtml(item.size)} · Rasa: ${escapeHtml(item.flavor)} · Qty: ${item.quantity}x</span>
						${item.text && item.text !== '-' ? `<br /><span style="color:#7a6a5f;font-size:13px;">Tulisan: ${escapeHtml(item.text)}</span>` : ''}
					</td>
					<td style="padding:12px;border-bottom:1px solid #f1e7dc;text-align:right;white-space:nowrap;">${formatCurrency(item.subtotal)}</td>
				</tr>
			`
		)
		.join('');

	const fulfillmentHtml =
		deliveryOption === 'pickup'
			? `
				<p><strong>Metode:</strong> ${deliveryLabel}</p>
				<p><strong>Tanggal:</strong> ${formatDate(order.delivery_date)}</p>
				<p><strong>Waktu:</strong> ${escapeHtml(order.delivery_time || '-')}</p>
				<p><strong>Keterangan:</strong> Pickup di toko</p>
			`
			: `
				<p><strong>Metode:</strong> ${deliveryLabel}</p>
				<p><strong>Tanggal:</strong> ${formatDate(order.delivery_date)}</p>
				<p><strong>Waktu:</strong> ${escapeHtml(order.delivery_time || '-')}</p>
				<p><strong>Alamat:</strong><br />${escapeHtml(order.address || '-').replaceAll('\n', '<br />')}</p>
			`;

	const text = generateInvoiceText(order);
	const html = `
		<div style="margin:0;padding:0;background:#fff8f1;font-family:Arial,Helvetica,sans-serif;color:#4a3b32;">
			<div style="max-width:640px;margin:0 auto;padding:32px 20px;">
				<div style="background:#ffffff;border:1px solid #f1e7dc;border-radius:18px;overflow:hidden;">
					<div style="background:#8c5a35;color:#ffffff;padding:24px 28px;">
						<p style="margin:0 0 6px;font-size:13px;letter-spacing:0.16em;text-transform:uppercase;opacity:0.85;">Invoice</p>
						<h1 style="margin:0;font-family:Georgia,serif;font-size:30px;font-style:italic;">desertbyfir</h1>
					</div>

					<div style="padding:28px;">
						<h2 style="margin:0 0 18px;font-size:22px;color:#4a3b32;">Order #${escapeHtml(order.order_number)}</h2>
						<p style="margin:0 0 22px;color:#7a6a5f;">Terima kasih sudah memesan. Berikut detail invoice pesanan Anda.</p>

						<div style="margin-bottom:22px;padding:16px;background:#fffbf7;border-radius:14px;">
							<p style="margin:0 0 6px;"><strong>Nama:</strong> ${escapeHtml(order.customer_name)}</p>
							<p style="margin:0 0 6px;"><strong>No. HP:</strong> ${escapeHtml(order.phone_number)}</p>
							<p style="margin:0;"><strong>Email:</strong> ${escapeHtml(order.email || '-')}</p>
						</div>

						<h3 style="margin:0 0 10px;font-size:16px;">Detail Produk</h3>
						<table style="width:100%;border-collapse:collapse;margin-bottom:22px;border:1px solid #f1e7dc;border-radius:12px;overflow:hidden;">
							<tbody>${itemsHtml}</tbody>
						</table>

						<h3 style="margin:0 0 10px;font-size:16px;">${deliveryOption === 'pickup' ? 'Pickup' : 'Pengiriman'}</h3>
						<div style="margin-bottom:22px;padding:16px;background:#fffbf7;border-radius:14px;color:#4a3b32;">
							${fulfillmentHtml}
						</div>

						<div style="padding:18px;background:#4a3b32;color:#ffffff;border-radius:14px;">
							<p style="margin:0 0 8px;display:flex;justify-content:space-between;"><span>Harga Kue</span><strong>${formatCurrency(order.cake_price || order.amount)}</strong></p>
							<p style="margin:0 0 12px;display:flex;justify-content:space-between;"><span>Ongkos Kirim ${vehicleText ? `(${vehicleText})` : ''}</span><strong>${formatCurrency(order.delivery_fee || 0)}</strong></p>
							<p style="margin:12px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,0.25);display:flex;justify-content:space-between;font-size:20px;"><span>Total</span><strong>${formatCurrency(order.amount)}</strong></p>
						</div>
					</div>
				</div>
			</div>
		</div>
	`;

	return { subject, html, text };
}
