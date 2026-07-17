import { error } from '@sveltejs/kit';

export const load = async ({ params, locals: { supabase } }) => {
	const { id } = params;

	const { data: product, error: dbError } = await supabase
		.from('products')
		.select(`
			*,
			product_variants (
				id,
				name,
				price,
				is_active,
				display_order
			)
		`)
		.eq('id', id)
		.eq('is_active', true)
		.single();

	if (dbError || !product) {
		throw error(404, 'Product not found');
	}

	return {
		product,
	};
};
