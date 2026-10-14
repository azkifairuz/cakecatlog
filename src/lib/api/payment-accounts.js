import { apiFetch, unwrapData } from './client.js';
const base = '/admin/rekening-pembayaran';
export async function getPaymentAccounts(token, fetch) { return unwrapData(await apiFetch(base, { method: 'GET', token }, fetch)); }
export async function createPaymentAccount(body, token, fetch) { return unwrapData(await apiFetch(base, { method: 'POST', token, body }, fetch)); }
export async function updatePaymentAccount(id, body, token, fetch) { return unwrapData(await apiFetch(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', token, body }, fetch)); }
export async function deletePaymentAccount(id, token, fetch) { return unwrapData(await apiFetch(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE', token }, fetch)); }
