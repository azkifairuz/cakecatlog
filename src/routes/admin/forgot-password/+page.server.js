import { fail } from '@sveltejs/kit';
import { requestForgotPassword } from '$lib/api/account.js';
export const actions = { default: async ({ request, fetch }) => {
 const form = await request.formData(); const identifier = String(form.get('identifier') || '').trim();
 if (!identifier || identifier.length > 320) return fail(422, { error: 'Email atau username wajib diisi.', identifier });
 try { await requestForgotPassword(identifier, fetch); return { success: true, message: 'Jika akun ditemukan, permintaan penggantian password telah dikirim ke super admin.' }; }
 catch (err) { return fail(err.status === 429 ? 429 : 503, { error: err.status === 429 ? 'Terlalu banyak percobaan. Silakan coba lagi nanti.' : 'Permintaan belum dapat dikirim. Silakan coba lagi.', identifier }); }
} };
