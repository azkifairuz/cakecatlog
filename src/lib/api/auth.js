import { redirect } from '@sveltejs/kit';
import { apiFetch, unwrapData } from './client.js';
import { isAuthError } from '$lib/auth-errors.js';
import { clearAdminToken, getAdminToken, setAdminToken, invalidateAdminSession } from '../admin-session.js';

export { isAuthError, clearAdminToken, getAdminToken, setAdminToken };

export function handleAdminAuthError(err, cookies) {
	if (isAuthError(err)) {
		if (cookies) cookies.delete('admin_access_token', { path: '/' });
		if (typeof window !== 'undefined') {
			void invalidateAdminSession().catch(() => {});
		} else {
			throw redirect(303, '/admin/login');
		}
	}
}

export async function loginAdmin(email, password, customFetch = null) {
	const response = await apiFetch(
		'/auth/login',
		{
			method: 'POST',
			body: { identifier: email, password }
		},
		customFetch
	);

	const data = unwrapData(response);
	if (data?.accessToken) {
		setAdminToken(data.accessToken);
	}
	return data;
}

export async function logoutAdmin(token = null, customFetch = null) {
	try {
		await apiFetch(
			'/auth/logout',
			{
				method: 'POST',
				token: token || getAdminToken()
			},
			customFetch
		);
	} catch {
		// Ignore logout error if network fails
	} finally {
		clearAdminToken();
	}
}

export async function getAdminMe(token = null, customFetch = null) {
	const response = await apiFetch(
		'/auth/me',
		{
			method: 'GET',
			token: token || getAdminToken()
		},
		customFetch
	);
	return unwrapData(response);
}
