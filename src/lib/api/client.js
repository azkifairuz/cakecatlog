import { PUBLIC_API_BASE_URL } from '$env/static/public';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

export class ApiError extends Error {
	constructor(message, { status = 500, code = 'API_ERROR', details = null, fields = null } = {}) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
		this.fields = fields;
	}
}

export function getApiBaseUrl() {
	const base = PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
	return base.replace(/\/+$/, '');
}

export function unwrapData(response) {
	if (!response) return response;
	if (typeof response === 'object') {
		if (response.success === false) {
			const errMsg = response.message || response.error?.message || 'Permintaan gagal diproses';
			throw new ApiError(errMsg, {
				code: response.error?.code || 'ERROR',
				details: response.error?.details || response.details,
				fields: response.error?.fields || response.fields
			});
		}
		if ('data' in response) {
			return response.data;
		}
	}
	return response;
}

export async function apiFetch(path, options = {}, customFetch = null) {
	const fetchFn = customFetch || (typeof fetch !== 'undefined' ? fetch : null);
	if (!fetchFn) {
		throw new Error('fetch is not available in current environment');
	}

	const baseUrl = getApiBaseUrl();
	const cleanPath = path.startsWith('http://') || path.startsWith('https://')
		? path
		: `${baseUrl}/${path.replace(/^\/+/, '')}`;

	const { token, headers: customHeaders, body, ...restOptions } = options;
	const headers = new Headers(customHeaders || {});

	// Auto attach Bearer token if supplied in options or available from browser localStorage
	let authToken = token;
	if (!authToken && typeof window !== 'undefined' && window.localStorage) {
		try {
			authToken = window.localStorage.getItem('admin_access_token');
		} catch {
			// Ignore localStorage access restrictions
		}
	}

	if (authToken && !headers.has('Authorization')) {
		headers.set('Authorization', `Bearer ${authToken}`);
	}

	let finalBody = body;
	const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
	const isBlobOrBuffer = (typeof Blob !== 'undefined' && body instanceof Blob) ||
		(typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body)));

	if (body && typeof body === 'object' && !isFormData && !isBlobOrBuffer) {
		if (!headers.has('Content-Type')) {
			headers.set('Content-Type', 'application/json');
		}
		finalBody = JSON.stringify(body);
	}

	const requestInit = {
		...restOptions,
		headers,
		body: finalBody
	};

	let response;
	try {
		response = await fetchFn(cleanPath, requestInit);
	} catch (networkError) {
		throw new ApiError(
			`Gagal menghubungi backend API di ${cleanPath}: ${networkError.message || networkError}`,
			{ status: 503, code: 'NETWORK_ERROR' }
		);
	}

	const contentType = response.headers.get('content-type') || '';
	const isJson = contentType.includes('application/json');

	if (!isJson) {
		if (!response.ok) {
			const text = await response.text().catch(() => '');
			if (response.status === 401 && typeof window !== 'undefined') {
				try {
					window.localStorage.removeItem('admin_access_token');
				} catch {
					// Ignore
				}
				if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
					window.location.href = '/admin/login';
				}
			}
			throw new ApiError(`API request failed with status ${response.status}: ${text}`, {
				status: response.status,
				code: `HTTP_${response.status}`
			});
		}
		return response;
	}

	const json = await response.json().catch(() => ({}));

	if (!response.ok || json.success === false) {
		const errorMessage =
			json.message ||
			json.error?.message ||
			json.error ||
			`Permintaan gagal dengan status ${response.status}`;

		if (response.status === 401 && typeof window !== 'undefined') {
			try {
				window.localStorage.removeItem('admin_access_token');
			} catch {
				// Ignore
			}
			if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
				window.location.href = '/admin/login';
			}
		}

		throw new ApiError(errorMessage, {
			status: response.status,
			code: json.error?.code || json.code || `HTTP_${response.status}`,
			details: json.error?.details || json.details || null,
			fields: json.error?.fields || json.fields || null
		});
	}

	return json;
}
