// const HOME_CATALOG_LIMIT = 8;
// const HOME_TOP_PICKS_LIMIT = 6;

// export const load = async ({ locals: { supabase } }) => {
// 	const [productsResult, categoriesResult, bannersResult, topPicksResult, globalAddonsResult] =
// 		await Promise.all([
// 			supabase
// 				.from('products')
// 				.select(`
// 					*,
// 					category:categories (
// 						name,
// 						slug
// 					),
// 					product_images (
// 						image_url,
// 						is_primary
// 					),
// 					product_addons (
// 						addon_id,
// 						is_active,
// 						global_addons (
// 							id,
// 							category,
// 							name,
// 							additional_price,
// 							is_dark_color,
// 							dark_color_surcharge,
// 							is_active
// 						)
// 					)
// 				`)
// 				.eq('is_active', true)
// 				.eq('is_available', true)
// 				.order('created_at', { ascending: false })
// 				.order('is_primary', { foreignTable: 'product_images', ascending: false })
// 				.limit(1, { foreignTable: 'product_images' })
// 				.limit(HOME_CATALOG_LIMIT),
// 			supabase.from('categories').select('*').order('name', { ascending: true }),
// 			supabase
// 				.from('hero_banners')
// 				.select('*')
// 				.eq('is_active', true)
// 				.order('display_order', { ascending: true }),
// 			supabase
// 				.from('top_selling_products')
// 				.select(`
// 					*,
// 					product_images(image_url, is_primary),
// 					product_addons (
// 						addon_id,
// 						is_active,
// 						global_addons (
// 							id,
// 							category,
// 							name,
// 							additional_price,
// 							is_dark_color,
// 							dark_color_surcharge,
// 							is_active
// 						)
// 					)
// 				`)
// 				.eq('is_active', true)
// 				.order('is_primary', { foreignTable: 'product_images', ascending: false })
// 				.limit(1, { foreignTable: 'product_images' })
// 				.limit(HOME_TOP_PICKS_LIMIT),
// 			supabase
// 				.from('global_addons')
// 				.select('*')
// 				.eq('is_active', true)
// 				.order('category')
// 				.order('name')
// 		]);

// 	const { data: products } = productsResult;
// 	const { data: categories } = categoriesResult;
// 	const { data: banners } = bannersResult;
// 	const { data: topPicks } = topPicksResult;
// 	const { data: globalAddons } = globalAddonsResult;

// 	const productsWithAddons = (products ?? []).map((product) => ({
// 		...product,
// 		global_addons: product.product_addons?.length ? [] : (globalAddons ?? [])
// 	}));
// 	const topPicksWithAddons = (topPicks ?? []).map((product) => ({
// 		...product,
// 		global_addons: product.product_addons?.length ? [] : (globalAddons ?? [])
// 	}));

// 	return {
// 		products: productsWithAddons,
// 		categories: categories ?? [],
// 		banners: banners ?? [],
// 		topPicks: topPicksWithAddons
// 	};
// };


const HOME_CATALOG_LIMIT = 8;
const HOME_TOP_PICKS_LIMIT = 6;

// Reusable select string tanpa join global_addons yang sia-sia
const PRODUCT_SELECT = `
  id, name, description, base_price, is_active, is_available, created_at,
  category:categories ( name, slug ),
  product_images ( image_url, is_primary ),
  product_variants ( id, name, price, is_active, display_order ),
  product_addons ( addon_id, is_active )
`;

const TOP_PICKS_SELECT = `
  *,
  product_images(image_url, is_primary),
  product_variants ( id, name, price, is_active, display_order ),
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

export const load = async ({ locals: { supabase } }) => {
  // Critical: categories & banners → kecil, fetch blocking
  const [categoriesResult, globalAddonsResult] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase.from('global_addons')
      .select('id, category, name, additional_price, is_dark_color, dark_color_surcharge, is_active')
      .eq('is_active', true).order('category').order('name')
  ]);

  const globalAddons = globalAddonsResult.data ?? [];
  const withAddons = (list) =>
    list.map((p) => ({ ...p, global_addons: p.product_addons?.length ? [] : globalAddons }));

  // Non-critical: stream ini, jangan di-await
  const bannersPromise = supabase
    .from('hero_banners')
    .select('id, image_url, display_order')
    .eq('is_active', true)
    .order('display_order')
    .then((r) => {
      if (r.error) {
        console.error('Failed to load hero banners', r.error);
        return [];
      }

      return r.data ?? [];
    });

  const productsPromise = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_active', true).eq('is_available', true)
    .order('created_at', { ascending: false })
    .order('is_primary', { foreignTable: 'product_images', ascending: false })
    .limit(1, { foreignTable: 'product_images' })
    .limit(HOME_CATALOG_LIMIT)
    .then(r => withAddons(r.data ?? []));

  const topPicksPromise = supabase
    .from('top_selling_products')
    .select(TOP_PICKS_SELECT)
	  .eq('is_active',true)
    .eq('is_available', true)
    .order('total_orders', { ascending: false })
    .order('is_primary', { foreignTable: 'product_images', ascending: false })
    .limit(1, { foreignTable: 'product_images' })
    .limit(HOME_TOP_PICKS_LIMIT)
    .then((r) => {
      if (r.error) {
        console.error('Failed to load top picks', r.error);
        return [];
      }

      return withAddons(r.data ?? []);
    });

  return {
    categories: categoriesResult.data ?? [],
    // Ini di-stream, SvelteKit kirim HTML duluan
    banners: bannersPromise,
    products: productsPromise,
    topPicks: topPicksPromise
  };
};

// export const load = async ({ locals: { supabase } }) => {
//   const [productsResult, categoriesResult, bannersResult, topPicksResult, globalAddonsResult] =
//     await Promise.all([
//       supabase
//         .from('products')
//         .select(PRODUCT_SELECT)
//         .eq('is_active', true)
//         .eq('is_available', true)
//         .order('created_at', { ascending: false })
//         .order('is_primary', { foreignTable: 'product_images', ascending: false })
//         .limit(1, { foreignTable: 'product_images' })
//         .limit(HOME_CATALOG_LIMIT),

//       supabase
//         .from('categories')
//         .select('id, name, slug')
//         .order('name', { ascending: true }),

//       supabase
//         .from('hero_banners')
//         .select('id, image_url, title, subtitle, cta_text, cta_url, display_order')
//         .eq('is_active', true)
//         .order('display_order', { ascending: true }),

//       supabase
//         .from('top_selling_products')
//         .select(TOP_PICKS_SELECT)
//         .eq('is_active', true)
//         .order('is_primary', { foreignTable: 'product_images', ascending: false })
//         .limit(1, { foreignTable: 'product_images' })
//         .limit(HOME_TOP_PICKS_LIMIT),

//       supabase
//         .from('global_addons')
//         .select('id, category, name, additional_price, is_dark_color, dark_color_surcharge, is_active')
//         .eq('is_active', true)
//         .order('category')
//         .order('name')
//     ]);

//   const products = productsResult.data ?? [];
//   const categories = categoriesResult.data ?? [];
//   const banners = bannersResult.data ?? [];
//   const topPicks = topPicksResult.data ?? [];
//   const globalAddons = globalAddonsResult.data ?? [];

//   // Mapping: kalau product punya custom addons → kosong, kalau tidak → pakai global
//   const withAddons = (list) =>
//     list.map((p) => ({
//       ...p,
//       global_addons: p.product_addons?.length ? [] : globalAddons
//     }));

//   return {
//     products: withAddons(products),
//     categories,
//     banners,
//     topPicks: withAddons(topPicks)
//   };
// };
