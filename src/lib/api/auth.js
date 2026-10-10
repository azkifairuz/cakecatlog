import { redirect } from '@sveltejs/kit';
import { apiFetch, unwrapData } from './client.js';
import { isAuthError } from '$lib/auth-errors.js';

export { isAuthError };

const TOKEN_STORAGE_KEY = 'admin_access_token';

export function handleAdminAuthError(err, cookies) {
	if (isAuthError(err)) {
		if (cookies) {
			cookies.delete('admin_access_token', { path: '/' });
		}
		if (typeof window !== 'undefined') {
			clearAdminToken();
			window.location.href = '/admin/login';
		} else {
			throw redirect(303, '/admin/login');
		}
	}
}


export function getAdminToken() {
	if (typeof window !== 'undefined' && window.localStorage) {
		try {
			return window.localStorage.getItem(TOKEN_STORAGE_KEY);
		} catch {
			return null;
		}
	}
	return null;
}

export function setAdminToken(token) {
	if (typeof window !== 'undefined' && window.localStorage) {
		try {
			if (token) {
				window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
			} else {
				window.localStorage.removeItem(TOKEN_STORAGE_KEY);
			}
		} catch {
			// Ignore localStorage restrictions
		}
	}
}

export function clearAdminToken() {
	setAdminToken(null);
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
