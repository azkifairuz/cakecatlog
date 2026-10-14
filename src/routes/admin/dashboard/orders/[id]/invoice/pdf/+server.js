import { error } from '@sveltejs/kit';
import { requireAdminAccess } from '$lib/server/admin-access.js';
import { getThermalInvoice } from '$lib/api/order-print.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
export async function GET(event) {
 requireAdminAccess(event, 'order.read');
 let response;
 try { response = await getThermalInvoice(event.params.id, event.locals.adminToken, event.fetch); }
 catch (err) { handleAdminAuthError(err, event.cookies); error(err.status || 502, 'PDF invoice belum dapat dimuat.'); }
 if (!(response instanceof Response) || !response.ok || !response.headers.get('content-type')?.startsWith('application/pdf')) error(502, 'Respons PDF tidak valid.');
 return new Response(response.body, { headers: { 'content-type': 'application/pdf', 'content-disposition': response.headers.get('content-disposition') || 'inline; filename="invoice.pdf"', 'cache-control': 'private, no-store' } });
}
