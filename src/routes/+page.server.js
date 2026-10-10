import { getHomeData } from '$lib/api/public.js';
import { adaptProducts } from '$lib/api/adapters.js';

export const load = async ({ fetch }) => {
	const homeDataPromise = getHomeData(fetch).catch((err) => {
		console.error('Failed to load home data from API:', err);
		return {
			banners: [],
			categories: [],
			latestProducts: [],
			topPicks: [],
			globalAddons: []
		};
	});

	const bannersPromise = homeDataPromise.then((data) =>
		(data.banners ?? []).map((banner) => ({
			...banner,
			image_url: banner.image_url || banner.imageUrl,
			imageUrl: banner.imageUrl || banner.image_url,
			is_active: banner.is_active ?? banner.isActive ?? true,
			isActive: banner.isActive ?? banner.is_active ?? true,
			display_order: banner.display_order ?? banner.displayOrder ?? 0,
			displayOrder: banner.displayOrder ?? banner.display_order ?? 0
		}))
	);
	const catalogPromise = homeDataPromise.then((data) => ({
		categories: data.categories ?? [],
		products: adaptProducts(data.latestProducts ?? [])
	}));
	const topPicksPromise = homeDataPromise.then((data) => adaptProducts(data.topPicks ?? []));

	return {
		banners: bannersPromise,
		catalog: catalogPromise,
		topPicks: topPicksPromise
	};
};
