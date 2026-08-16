import { error } from '@sveltejs/kit';
import {
	applyOrderFilters,
	ORDER_LIST_SELECT,
	parseOrderFilters
} from '$lib/server/admin-orders.js';

function getDeliveryOption(order) {
	if (order.delivery_option === 'pickup' || order.delivery_option === 'delivery') {
		return order.delivery_option;
	}
	return order.address === 'Pickup' ? 'pickup' : 'delivery';
}

function getExportRows(orders) {
	return orders.map((order, index) => ({
		No: index + 1,
		'No Order': order.order_number,
		'Nama Pelanggan': order.customer_name,
		'No HP': order.phone_number,
		Email: order.email ?? '-',
		Metode: getDeliveryOption(order) === 'pickup' ? 'Pickup' : 'Delivery',
		Produk:
			order.order_items?.map((item) => item.products?.name).filter(Boolean).join(', ') ||
			order.products?.name ||
			'-',
		Ukuran: order.cake_size ?? '-',
		Qty: order.quantity,
		'Tanggal Kirim': order.delivery_date ?? '-',
		'Waktu Kirim': order.delivery_time ?? '-',
		Alamat: getDeliveryOption(order) === 'delivery' ? (order.address ?? '-') : 'Pickup',
		Status: order.status,
		'Total Harga': order.amount ?? 0,
		'Tulisan Kue': order.cake_text ?? '-'
	}));
}

export async function GET({ locals: { supabase }, url }) {
	const isDashboard = url.searchParams.get('scope') === 'dashboard';
	const filters = parseOrderFilters(url, { singleDate: !isDashboard });
	const { data: orders, error: queryError } = await applyOrderFilters(
		supabase.from('orders').select(ORDER_LIST_SELECT),
		filters
	).order('created_at', { ascending: false });

	if (queryError) {
		console.error('Unable to export admin orders:', queryError);
		throw error(500, 'Data export belum dapat dibuat.');
	}

	const XLSX = await import('xlsx');
	const worksheet = XLSX.utils.json_to_sheet(getExportRows(orders ?? []));
	worksheet['!cols'] = [
		{ wch: 4 }, { wch: 12 }, { wch: 24 }, { wch: 16 }, { wch: 28 },
		{ wch: 12 }, { wch: 28 }, { wch: 12 }, { wch: 6 }, { wch: 15 },
		{ wch: 13 }, { wch: 36 }, { wch: 16 }, { wch: 18 }, { wch: 32 }
	];
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Pesanan');
	const file = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
	const range = filters.start === filters.end ? filters.start : `${filters.start}_${filters.end}`;

	return new Response(file, {
		headers: {
			'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'content-disposition': `attachment; filename="Daftar_Pesanan_${range}.xlsx"`,
			'cache-control': 'private, no-store'
		}
	});
}
