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

	return {
		products: products ?? [],
		categories: categories ?? []
	};
};
