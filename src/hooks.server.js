import { redirect } from '@sveltejs/kit';
import { getAdminMe, isAuthError } from '$lib/api/auth.js';

const PUBLIC_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const NO_STORE_CACHE_CONTROL = 'no-store, max-age=0';

export const handle = async ({ event, resolve }) => {
	const requestStartedAt = performance.now();

	let adminToken = event.cookies.get('admin_access_token') || null;
	event.locals.adminToken = adminToken;
	event.locals.adminUser = null;

	const isAdminRoute = event.url.pathname.startsWith('/admin');
	const isAdminLoginRoute = event.url.pathname === '/admin/login';
	const isAdminLogoutRoute = event.url.pathname === '/admin/logout';

	if (isAdminRoute && !isAdminLogoutRoute) {
		if (adminToken) {
			try {
				const user = await getAdminMe(adminToken, event.fetch);
				event.locals.adminUser = user;
			} catch (err) {
				console.error('Admin token validation failed in hooks:', err);
				if (isAuthError(err)) {
					event.cookies.delete('admin_access_token', { path: '/' });
					adminToken = null;
					event.locals.adminToken = null;
					event.locals.adminUser = null;
				}
			}
		}

		// Protect admin dashboard routes
		if (!isAdminLoginRoute && !event.locals.adminToken) {
			throw redirect(303, '/admin/login');
		}

		// Redirect logged-in admin away from login page
		if (isAdminLoginRoute && event.locals.adminToken) {
			throw redirect(303, '/admin/dashboard');
		}
	}

	const response = await resolve(event);

	if (event.request.method === 'GET' && response.ok) {
		if (event.url.pathname === '/') {
			response.headers.set('cache-control', NO_STORE_CACHE_CONTROL);
		} else if (isCacheablePublicPage(event.url.pathname)) {
			response.headers.set('cache-control', PUBLIC_CACHE_CONTROL);
		}
	}

	const timings = [`app;dur=${(performance.now() - requestStartedAt).toFixed(1)}`];
	response.headers.set('server-timing', timings.join(', '));

	return response;
};

function isCacheablePublicPage(pathname) {
	if (pathname === '/catalog') return true;
	if (pathname.startsWith('/product/')) return true;
	return false;
}
