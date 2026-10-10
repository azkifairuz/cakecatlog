import { getProducts, getCategories } from '$lib/api/public.js';
import { adaptProducts } from '$lib/api/adapters.js';

const PRODUCTS_PER_PAGE = 6;

export const load = async ({ fetch, url }) => {
	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
	const selectedCategoryId = url.searchParams.get('categoryId') || url.searchParams.get('category') || 'All';
	const searchQuery = (url.searchParams.get('q') || url.searchParams.get('search') || '').trim();
	const sortBy = (url.searchParams.get('sortBy') || 'latest').trim();

	const [productsRes, categoriesRes] = await Promise.all([
		getProducts(
			{
				page,
				pageSize: PRODUCTS_PER_PAGE,
				categoryId: selectedCategoryId !== 'All' ? selectedCategoryId : undefined,
				q: searchQuery || undefined,
				sortBy
			},
			fetch
		).catch((err) => {
			console.error('Failed to load products for catalog:', err);
			return {
				items: [],
				pagination: {
					page,
					pageSize: PRODUCTS_PER_PAGE,
					totalItems: 0,
					totalPages: 1,
					from: 0,
					to: 0
				}
			};
		}),
		getCategories(fetch).catch((err) => {
			console.error('Failed to load categories for catalog:', err);
			return [];
		})
	]);

	const rawProducts = productsRes.items || productsRes.products || productsRes.data?.items || productsRes.data?.products || [];
	const categories = Array.isArray(categoriesRes)
		? categoriesRes
		: (categoriesRes.categories || categoriesRes.data?.categories || categoriesRes.data || []);

	const totalProducts = productsRes.pagination?.totalItems ?? productsRes.pagination?.totalProducts ?? rawProducts.length;
	const pagination = {
		page: productsRes.pagination?.page ?? page,
		pageSize: productsRes.pagination?.pageSize ?? PRODUCTS_PER_PAGE,
		totalProducts,
		totalPages: productsRes.pagination?.totalPages ?? Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE)),
		from: productsRes.pagination?.from ?? (rawProducts.length > 0 ? (page - 1) * PRODUCTS_PER_PAGE + 1 : 0),
		to: productsRes.pagination?.to ?? (rawProducts.length > 0 ? Math.min(page * PRODUCTS_PER_PAGE, totalProducts) : 0)
	};

	return {
		products: adaptProducts(rawProducts),
		categories: Array.isArray(categories) ? categories : [],
		selectedCategoryId,
		searchQuery,
		sortBy,
		pagination
	};
};
