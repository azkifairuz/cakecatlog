import { error } from '@sveltejs/kit';

export const load = async ({ params, locals: { supabase } }) => {
	const { id } = params;

	const { data: product, error: dbError } = await supabase
		.from('products')
		.select(`
			*,
			category:categories (
				name
			),
			product_images (
				image_url,
				is_primary
			)
		`)
		.eq('id', id)
		.single();

	if (dbError || !product) {
		throw error(404, 'Product not found');
	}

	return {
		product,
	};
};
