import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

const PUBLIC_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const NO_STORE_CACHE_CONTROL = 'no-store, max-age=0';

export const handle = async ({ event, resolve }) => {
	const requestStartedAt = performance.now();
	let authDuration = 0;
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			/**
			 * SvelteKit's cookies API requires `path` to be explicitly set in
			 * the cookie options. Setting `path` to `/` replicates previous/
			 * standard behavior.
			 */
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			},
		},
	});

	/**
	 * Unlike `supabase.auth.getSession()`, which returns the session _without_
	 * validating the JWT, this function also calls `getUser()` to validate the
	 * JWT before returning the session.
	 */
	event.locals.safeGetSession = async () => {
		const authStartedAt = performance.now();
		const {
			data: { session },
			error: sessionError
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			authDuration += performance.now() - authStartedAt;
			return { session: null, user: null, claims: null, error: sessionError };
		}

		const { data, error } = await event.locals.supabase.auth.getClaims(session.access_token);
		authDuration += performance.now() - authStartedAt;

		if (error || !data?.claims) {
			return { session: null, user: null, claims: null, error };
		}

		return { session, user: null, claims: data.claims, error: null };
	};

	const isAdminRoute = event.url.pathname.startsWith('/admin');
	const isAdminLoginRoute = event.url.pathname === '/admin/login';
	let session = null;
	let claims = null;

	if (isAdminRoute) {
		({ session, claims } = await event.locals.safeGetSession());
	}
	
	// Protect admin routes
	if (isAdminRoute && !isAdminLoginRoute) {
		if (!session || !claims) {
			// Not authenticated, redirect to login
			throw redirect(303, '/admin/login');
		}
	}
	
	// Redirect logged-in users away from login page
	if (isAdminLoginRoute && session && claims) {
		throw redirect(303, '/admin/dashboard');
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});

	if (event.request.method === 'GET' && response.ok) {
		if (event.url.pathname === '/') {
			response.headers.set('cache-control', NO_STORE_CACHE_CONTROL);
		} else if (isCacheablePublicPage(event.url.pathname)) {
			response.headers.set('cache-control', PUBLIC_CACHE_CONTROL);
		}
	}

	const timings = [`app;dur=${(performance.now() - requestStartedAt).toFixed(1)}`];
	if (authDuration > 0) timings.unshift(`auth;dur=${authDuration.toFixed(1)}`);
	response.headers.set('server-timing', timings.join(', '));

	return response;
};

function isCacheablePublicPage(pathname) {
	if (pathname === '/catalog') return true;
	if (pathname.startsWith('/product/')) return true;
	return false;
}
