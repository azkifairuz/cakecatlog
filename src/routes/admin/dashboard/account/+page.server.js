import { fail } from '@sveltejs/kit';
import { requireAdminAccess } from '$lib/server/admin-access.js';
import { changePassword } from '$lib/api/account.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
export function load(event) { const admin = requireAdminAccess(event); return { username: admin.username }; }
export const actions = { save: async (event) => {
 requireAdminAccess(event);
 const form = await event.request.formData();
 const currentPassword = String(form.get('currentPassword') || '');
 const newPassword = String(form.get('newPassword') || '');
 if (!currentPassword || currentPassword.length > 200 || newPassword.length < 8 || newPassword.length > 200 || !newPassword.trim()) return fail(422, { error: 'Password baru minimal 8 dan maksimal 200 karakter.' });
 if (newPassword !== form.get('confirmPassword')) return fail(422, { error: 'Konfirmasi password tidak sama.' });
 try { await changePassword({ currentPassword, newPassword }, event.locals.adminToken, event.fetch); return { success: true, message: 'Password berhasil diubah. API key akun Anda telah dibatalkan; buat key baru bila diperlukan.' }; }
 catch (err) {
  if (!(err.status === 401 && err.message === 'Password saat ini salah')) handleAdminAuthError(err, event.cookies);
  return fail(err.status || 500, { error: err.message || 'Gagal mengubah password.' });
 }
} };
