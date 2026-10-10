import { error } from '@sveltejs/kit';
import { getProductDetail } from '$lib/api/public.js';
import { adaptProduct } from '$lib/api/adapters.js';

export const load = async ({ params, fetch }) => {
	const { id } = params;

	try {
		const productRes = await getProductDetail(id, fetch);
		const rawProduct = productRes?.product || productRes?.data?.product || productRes?.data || productRes;

		if (!rawProduct || !rawProduct.id) {
			throw error(404, 'Product not found');
		}

		const product = adaptProduct(rawProduct);

		return {
			product
		};
	} catch (err) {
		if (err?.status === 404 || err?.message?.includes('not found')) {
			throw error(404, 'Product not found');
		}
		throw error(err?.status || 500, err?.message || 'Failed to load product');
	}
};

