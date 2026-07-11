export const load = async ({ locals: { supabase } }) => {
	const { data: products, error } = await supabase
		.from('products')
		.select(`
			*,
			category:categories (
				name,
				slug
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
		.eq('is_available', true)
		.order('created_at', { ascending: false })
		.order('is_primary', { foreignTable: 'product_images', ascending: false })
		.limit(1, { foreignTable: 'product_images' });

	const { data: categories } = await supabase
		.from('categories')
		.select('*')
		.order('name', { ascending: true });

	const { data: banners } = await supabase
		.from('hero_banners')
		.select('*')
		.eq('is_active', true)
		.order('display_order', { ascending: true });

	const { data: topPicks } = await supabase
		.from('top_selling_products')
		.select(`
			*,
			product_images(image_url, is_primary),
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
		.order('is_primary', { foreignTable: 'product_images', ascending: false })
		.limit(1, { foreignTable: 'product_images' });

	const { data: globalAddons } = await supabase
		.from('global_addons')
		.select('*')
		.eq('is_active', true)
		.order('category')
		.order('name');

	const productsWithAddons = (products ?? []).map((product) => ({
		...product,
		global_addons: product.product_addons?.length ? [] : (globalAddons ?? [])
	}));
	const topPicksWithAddons = (topPicks ?? []).map((product) => ({
		...product,
		global_addons: product.product_addons?.length ? [] : (globalAddons ?? [])
	}));

	return {
		products: productsWithAddons,
		categories: categories ?? [],
		banners: banners ?? [],
		topPicks: topPicksWithAddons
	};
};
