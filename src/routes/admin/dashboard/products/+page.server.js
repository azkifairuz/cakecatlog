export const load = async ({ locals: { supabase } }) => {
	const { data: products, error } = await supabase
		.from('products')
		.select(`
			*,
			category:categories (
				name,
				slug
			),
			product_images (
				id,
				image_url,
				is_primary
			)
		`)
		.order('created_at', { ascending: false });

	const { data: categories } = await supabase.from('categories').select('*').order('name');

	return {
		products: products ?? [],
		categories: categories ?? []
	};
};

export const actions = {
	createProduct: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const name = formData.get('name');
		const description = formData.get('description');
		const base_price = formData.get('base_price');
		const is_available = formData.get('is_available') === 'on';
		const category_id = formData.get('category_id');
		const images = formData.getAll('images');
		
		const sizes = formData.get('sizes');
		const colors = formData.get('colors');
		const flavors = formData.get('flavors');
		const crown_options = formData.get('crown_options');
		const edible_glitter = formData.get('edible_glitter');

		if (!name || !base_price) {
			return { success: false, error: 'Name and Base Price are required' };
		}

		// Insert product
		const { data: product, error: productError } = await supabase
			.from('products')
			.insert({
				name,
				description,
				base_price: parseFloat(base_price),
				is_available,
				category_id: category_id || null,
				sizes,
				colors,
				flavors,
				crown_options,
				edible_glitter
			})
			.select()
			.single();

		if (productError) {
			return { success: false, error: productError.message };
		}

		// Handle images
		if (images && images.length > 0 && images[0].size > 0) {
			const uploadPromises = images.map(async (file, i) => {
				const fileExt = file.name.split('.').pop();
				const fileName = `${product.id}-${Math.random()}.${fileExt}`;
				const filePath = `product/${fileName}`; // Changed to bucket 'products', folder 'product'

				const { error: uploadError } = await supabase.storage
					.from('products')
					.upload(filePath, file);

				if (!uploadError) {
					const { data: publicUrlData } = supabase.storage
						.from('products')
						.getPublicUrl(filePath);

					return {
						product_id: product.id,
						image_url: publicUrlData.publicUrl,
						is_primary: i === 0 // First image is primary
					};
				}
				return null;
			});

			const results = await Promise.all(uploadPromises);
			const imageInserts = results.filter(res => res !== null);

			if (imageInserts.length > 0) {
				await supabase.from('product_images').insert(imageInserts);
			}
		}

		return { success: true };
	},
	updateProduct: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const name = formData.get('name');
		const description = formData.get('description');
		const base_price = formData.get('base_price');
		const is_available = formData.get('is_available') === 'on';
		const category_id = formData.get('category_id');
		const images = formData.getAll('images');
		const deletedImageIdsStr = formData.get('deleted_image_ids');
		
		const sizes = formData.get('sizes');
		const colors = formData.get('colors');
		const flavors = formData.get('flavors');
		const crown_options = formData.get('crown_options');
		const edible_glitter = formData.get('edible_glitter');

		if (!id || !name || !base_price) {
			return { success: false, error: 'ID, Name, and Base Price are required' };
		}

		// Update product
		const { error: productError } = await supabase
			.from('products')
			.update({
				name,
				description,
				base_price: parseFloat(base_price),
				is_available,
				category_id: category_id || null,
				sizes,
				colors,
				flavors,
				crown_options,
				edible_glitter
			})
			.eq('id', id);

		if (productError) {
			return { success: false, error: productError.message };
		}

		// Delete images
		if (deletedImageIdsStr) {
			const deletedIds = deletedImageIdsStr.split(',').filter(Boolean);
			if (deletedIds.length > 0) {
				// Fetch URLs to delete from storage
				const { data: imagesToDelete } = await supabase
					.from('product_images')
					.select('image_url')
					.in('id', deletedIds);

				if (imagesToDelete && imagesToDelete.length > 0) {
					const paths = imagesToDelete.map(img => {
						const url = new URL(img.image_url);
						const parts = url.pathname.split('/');
						const pathIndex = parts.indexOf('products');
						return parts.slice(pathIndex + 1).join('/');
					});
					
					if (paths.length > 0) {
						await supabase.storage.from('products').remove(paths);
					}
				}

				await supabase.from('product_images').delete().in('id', deletedIds);
			}
		}

		// Upload new images
		if (images && images.length > 0 && images[0].size > 0) {
			const uploadPromises = images.map(async (file) => {
				const fileExt = file.name.split('.').pop();
				const fileName = `${id}-${Math.random()}.${fileExt}`;
				const filePath = `product/${fileName}`;

				const { error: uploadError } = await supabase.storage
					.from('products')
					.upload(filePath, file);

				if (!uploadError) {
					const { data: publicUrlData } = supabase.storage
						.from('products')
						.getPublicUrl(filePath);

					return {
						product_id: id,
						image_url: publicUrlData.publicUrl,
						is_primary: false // default to false initially
					};
				}
				return null;
			});

			const results = await Promise.all(uploadPromises);
			const imageInserts = results.filter(res => res !== null);

			if (imageInserts.length > 0) {
				await supabase.from('product_images').insert(imageInserts);
			}
		}

		// Ensure one image is primary
		const { data: currentImages } = await supabase
			.from('product_images')
			.select('id, is_primary')
			.eq('product_id', id)
			.order('created_at', { ascending: true });

		if (currentImages && currentImages.length > 0) {
			const hasPrimary = currentImages.some(img => img.is_primary);
			if (!hasPrimary) {
				await supabase
					.from('product_images')
					.update({ is_primary: true })
					.eq('id', currentImages[0].id);
			}
		}

		return { success: true };
	},
	deleteProduct: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return { success: false, error: 'Missing ID' };

		// Fetch images to delete from storage
		const { data: images } = await supabase
			.from('product_images')
			.select('image_url')
			.eq('product_id', id);
		
		if (images && images.length > 0) {
			const paths = images.map(img => {
				const url = new URL(img.image_url);
				const parts = url.pathname.split('/');
				// /storage/v1/object/public/products/product/filename.jpg
				// Extract 'product/filename.jpg'
				const pathIndex = parts.indexOf('products');
				return parts.slice(pathIndex + 1).join('/');
			});
			
			if (paths.length > 0) {
				await supabase.storage.from('products').remove(paths);
			}
		}

		const { error } = await supabase.from('products').delete().eq('id', id);

		if (error) return { success: false, error: error.message };
		return { success: true };
	},
	toggleAvailability: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const is_available = formData.get('is_available') === 'true';

		if (!id) return { success: false, error: 'Missing ID' };

		const { error } = await supabase
			.from('products')
			.update({ is_available: !is_available })
			.eq('id', id);
			
		if (error) return { success: false, error: error.message };
		return { success: true };
	}
};
