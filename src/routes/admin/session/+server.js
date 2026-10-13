import { json } from '@sveltejs/kit';

const headers = { 'cache-control': 'no-store, max-age=0' };

export function POST({ locals }) {
	if (!locals.adminToken) return json({ message: 'Sesi admin berakhir.' }, { status: 401, headers });
	if (!locals.adminUser) return json({ message: 'Sesi admin belum dapat divalidasi.' }, { status: 503, headers });
	return json({ token: locals.adminToken }, { headers });
}

export function DELETE({ cookies }) {
	cookies.delete('admin_access_token', { path: '/' });
	return json({ success: true }, { headers });
}
