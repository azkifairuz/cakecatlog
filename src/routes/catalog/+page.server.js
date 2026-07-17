const PRODUCTS_PER_PAGE = 6;

export const load = async ({ locals: { supabase }, url }) => {
	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const selectedCategory = url.searchParams.get('category') || 'All';
	const from = (page - 1) * PRODUCTS_PER_PAGE;
	const to = from + PRODUCTS_PER_PAGE - 1;

	const categoryJoin = selectedCategory === 'All' ? 'category:categories' : 'category:categories!inner';
	const productSelect = `
		*,
		${categoryJoin} (
			name,
			slug
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
	`;

	let productsQuery = supabase
		.from('products')
		.select(productSelect, { count: 'exact' })
		.eq('is_active', true)
		.eq('is_available', true)
		.order('created_at', { ascending: false })
		.order('is_primary', { foreignTable: 'product_images', ascending: false })
		.limit(1, { foreignTable: 'product_images' })
		.range(from, to);

	if (selectedCategory !== 'All') {
		productsQuery = productsQuery.eq('category.slug', selectedCategory);
	}

	const [productsResult, categoriesResult, globalAddonsResult] = await Promise.all([
		productsQuery,
		supabase.from('categories').select('*').order('name', { ascending: true }),
		supabase
			.from('global_addons')
			.select('*')
			.eq('is_active', true)
			.order('category')
			.order('name')
	]);

	const { data: products, count } = productsResult;
	const { data: categories } = categoriesResult;
	const { data: globalAddons } = globalAddonsResult;
	const totalProducts = count ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));

	const productsWithAddons = (products ?? []).map((product) => ({
		...product,
		global_addons: product.product_addons?.length ? [] : (globalAddons ?? [])
	}));

	return {
		products: productsWithAddons,
		categories: categories ?? [],
		selectedCategory,
		pagination: {
			page,
			pageSize: PRODUCTS_PER_PAGE,
			totalProducts,
			totalPages,
			from: totalProducts === 0 ? 0 : from + 1,
			to: Math.min(to + 1, totalProducts)
		}
	};
};
