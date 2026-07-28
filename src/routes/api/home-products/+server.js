import { json } from '@sveltejs/kit';

const HOME_CATALOG_LIMIT = 8;

const PRODUCT_SELECT = `
	id, name, description, base_price, is_active, is_available, created_at,
	category:categories!inner ( name, slug ),
	product_images ( image_url, is_primary ),
	product_variants ( id, name, price, is_active, display_order ),
	product_addons ( addon_id, is_active )
`;

export const GET = async ({ url, locals: { supabase }, setHeaders }) => {
	const category = String(url.searchParams.get('category') || '').trim();
	if (!category) return json({ error: 'Category is required.' }, { status: 400 });

	const [productsResult, globalAddonsResult] = await Promise.all([
		supabase
			.from('products')
			.select(PRODUCT_SELECT)
			.eq('is_active', true)
			.eq('is_available', true)
			.eq('category.slug', category)
			.order('created_at', { ascending: false })
			.order('is_primary', { foreignTable: 'product_images', ascending: false })
			.limit(1, { foreignTable: 'product_images' })
			.limit(HOME_CATALOG_LIMIT),
		supabase
			.from('global_addons')
			.select('id, category, name, additional_price, is_dark_color, dark_color_surcharge, is_active')
			.order('category')
			.order('name')
	]);

	if (productsResult.error) {
		console.error('Failed to load home category products:', productsResult.error);
		return json({ error: 'Unable to load category products.' }, { status: 500 });
	}

	if (globalAddonsResult.error) {
		console.error('Failed to load global addons for home category:', globalAddonsResult.error);
	}

	const globalAddons = globalAddonsResult.data ?? [];
	const products = (productsResult.data ?? []).map((product) => ({ ...product, global_addons: globalAddons }));

	setHeaders({ 'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' });
	return json({ products });
};
