export const load = async ({ locals: { supabase } }) => {
	const { data: products, error } = await supabase
		.from('products')
		.select(`
			id,
			name,
			description,
			base_price,
			category_id,
			category:categories (
				name,
				slug
			),
			product_images (
				image_url,
				is_primary
			)
		`)
		.eq('is_available', true)
		.order('created_at', { ascending: false });

	const { data: categories } = await supabase
		.from('categories')
		.select('*')
		.order('name', { ascending: true });

	const { data: banners } = await supabase
		.from('hero_banners')
		.select('*')
		.eq('is_active', true)
		.order('display_order', { ascending: true });

	return {
		products: products ?? [],
		categories: categories ?? [],
		banners: banners ?? []
	};
};
