import { apiFetch, unwrapData } from './client.js';
export async function changePassword(body, token, fetch) { return unwrapData(await apiFetch('/auth/password', { method: 'PATCH', token, body }, fetch)); }
export async function requestForgotPassword(identifier, fetch) { return apiFetch('/auth/forgot-password', { method: 'POST', body: { identifier } }, fetch); }
