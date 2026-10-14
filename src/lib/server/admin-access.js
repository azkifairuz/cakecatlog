import { error, redirect } from '@sveltejs/kit';
import { hasAdminPermission } from '$lib/admin-access.js';
export function requireAdminAccess(event, permission) {
 event.setHeaders?.({ 'cache-control': 'private, no-store' });
 if (!event.locals.adminToken) redirect(303, '/admin/login');
 if (!event.locals.adminUser) error(503, 'Akun admin belum dapat dimuat. Silakan coba lagi.');
 if (!hasAdminPermission(event.locals.adminUser, permission)) error(403, 'Anda tidak memiliki izin untuk fitur ini.');
 return event.locals.adminUser;
}
