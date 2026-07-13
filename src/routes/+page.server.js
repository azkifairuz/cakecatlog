const HOME_CATALOG_LIMIT = 8;
const HOME_TOP_PICKS_LIMIT = 6;

export const load = async ({ locals: { supabase } }) => {
	const [productsResult, categoriesResult, bannersResult, topPicksResult, globalAddonsResult] =
		await Promise.all([
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
				.limit(1, { foreignTable: 'product_images' })
				.limit(HOME_CATALOG_LIMIT),
			supabase.from('categories').select('*').order('name', { ascending: true }),
			supabase
				.from('hero_banners')
				.select('*')
				.eq('is_active', true)
				.order('display_order', { ascending: true }),
			supabase
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
				.eq('is_active', true)
				.order('is_primary', { foreignTable: 'product_images', ascending: false })
				.limit(1, { foreignTable: 'product_images' })
				.limit(HOME_TOP_PICKS_LIMIT),
			supabase
				.from('global_addons')
				.select('*')
				.eq('is_active', true)
				.order('category')
				.order('name')
		]);

	const { data: products } = productsResult;
	const { data: categories } = categoriesResult;
	const { data: banners } = bannersResult;
	const { data: topPicks } = topPicksResult;
	const { data: globalAddons } = globalAddonsResult;

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
