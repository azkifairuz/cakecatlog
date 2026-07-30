import { error } from '@sveltejs/kit';

export const load = async ({ params, locals: { supabase } }) => {
	const { data: category, error: categoryError } = await supabase
		.from('categories')
		.select('id, name, slug')
		.eq('slug', params.slug)
		.maybeSingle();

	if (categoryError) {
		console.error('Unable to load product category:', categoryError);
		throw error(500, 'Kategori belum dapat dimuat.');
	}

	if (!category) {
		throw error(404, 'Kategori tidak ditemukan.');
	}

	const { data: products, error: productsError } = await supabase
		.from('products')
		.select(`
			id,
			name,
			base_price,
			is_active,
			is_available,
			created_at,
			product_images (
				id,
				image_url,
				is_primary
			),
			product_variants (
				id,
				name,
				price,
				is_active,
				display_order
			)
		`)
		.eq('category_id', category.id)
		.order('created_at', { ascending: false });

	if (productsError) {
		console.error('Unable to load products for category:', productsError);
		throw error(500, 'Daftar produk belum dapat dimuat.');
	}

	return {
		category,
		products: products ?? []
	};
};
