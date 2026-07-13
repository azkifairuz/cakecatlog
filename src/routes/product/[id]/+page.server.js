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
			),
			product_addons (
				addon_id,
				is_active,
				global_addons (
					id,
					category,
					name,
					additional_price,
					is_dark_color,
					dark_color_surcharge,
					is_active
				)
			)
		`)
		.eq('id', id)
		.eq('is_active', true)
		.single();

	if (dbError || !product) {
		throw error(404, 'Product not found');
	}

	const hasProductAddons = (product.product_addons ?? []).length > 0;
	if (!hasProductAddons) {
		const { data: globalAddons } = await supabase
			.from('global_addons')
			.select('*')
			.eq('is_active', true)
			.order('category')
			.order('name');

		product.global_addons = globalAddons ?? [];
	}

	return {
		product,
	};
};
