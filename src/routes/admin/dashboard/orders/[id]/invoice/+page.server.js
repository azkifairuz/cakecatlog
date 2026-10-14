import { error } from '@sveltejs/kit';
import { requireAdminAccess } from '$lib/server/admin-access.js';
import { getOrderInvoice } from '$lib/api/order-invoice.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
export async function load(event) {
 requireAdminAccess(event, 'order.read');
 try { return { invoice: await getOrderInvoice(event.params.id, event.fetch) }; }
 catch (err) { handleAdminAuthError(err, event.cookies); error(err.status || 502, 'Invoice belum dapat dimuat.'); }
}
