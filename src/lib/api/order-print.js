import { apiFetch } from './client.js';
export function getThermalInvoice(id, token, fetch) {
 return apiFetch(`/admin/orders/${encodeURIComponent(id)}/receipt/pdf`, { method: 'GET', token }, fetch);
}
