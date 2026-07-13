export const load = async ({ locals: { supabase } }) => {
	const [productsResult, categoriesResult, globalAddonsResult] = await Promise.all([
		supabase
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
			.eq('is_active', true)
			.eq('is_available', true)
			.order('created_at', { ascending: false })
			.order('is_primary', { foreignTable: 'product_images', ascending: false })
			.limit(1, { foreignTable: 'product_images' }),
		supabase.from('categories').select('*').order('name', { ascending: true }),
		supabase
			.from('global_addons')
			.select('*')
			.eq('is_active', true)
			.order('category')
			.order('name')
	]);

	const { data: products } = productsResult;
	const { data: categories } = categoriesResult;
	const { data: globalAddons } = globalAddonsResult;

	const productsWithAddons = (products ?? []).map((product) => ({
		...product,
		global_addons: product.product_addons?.length ? [] : (globalAddons ?? [])
	}));

	return {
		products: productsWithAddons,
		categories: categories ?? []
	};
};
