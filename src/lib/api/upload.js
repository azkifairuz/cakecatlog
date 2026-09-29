import { apiFetch, unwrapData } from './client.js';

export async function uploadReferenceImage(file, customFetch = null) {
	if (!file) {
		throw new Error('File referensi wajib disertakan.');
	}

	const formData = new FormData();
	formData.append('file', file);

	const response = await apiFetch(
		'/uploads/reference-image',
		{
			method: 'POST',
			body: formData
		},
		customFetch
	);

	return unwrapData(response);
}

export async function uploadProductImage(file, token = null, customFetch = null) {
	if (!file) {
		throw new Error('File gambar produk wajib disertakan.');
	}

	const formData = new FormData();
	formData.append('file', file);

	const response = await apiFetch(
		'/admin/uploads/product-image',
		{
			method: 'POST',
			token,
			body: formData
		},
		customFetch
	);

	return unwrapData(response);
}

export async function uploadBanner(file, token = null, customFetch = null) {
	if (!file) {
		throw new Error('File gambar banner wajib disertakan.');
	}

	const formData = new FormData();
	formData.append('file', file);

	const response = await apiFetch(
		'/admin/uploads/banner',
		{
			method: 'POST',
			token,
			body: formData
		},
		customFetch
	);

	return unwrapData(response);
}
