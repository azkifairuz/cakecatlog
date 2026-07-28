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
			product_variants (
				id,
				name,
				price,
				is_active,
				display_order
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

	const { data: globalAddons, error: addonsError } = await supabase
		.from('global_addons')
		.select('*')
		.order('category')
		.order('name');

	if (addonsError) {
		console.error('Unable to load global addons for product detail:', addonsError);
	}

	// Global addons are an enhancement, not a reason to take the whole product
	// page down. Linked product addons from the main query remain usable when
	// this secondary query is temporarily unavailable.
	product.global_addons = globalAddons ?? [];

	return {
		product,
	};
};
