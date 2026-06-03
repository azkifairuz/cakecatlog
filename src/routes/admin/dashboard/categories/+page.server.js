export const load = async ({ locals: { supabase } }) => {
	const { data: categories, error } = await supabase
		.from('categories')
		.select('*')
		.order('created_at', { ascending: false });

	return {
		categories: categories ?? [],
	};
};

function generateSlug(text) {
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')        // Replace spaces with -
		.replace(/[^\w\-]+/g, '')    // Remove all non-word chars
		.replace(/\-\-+/g, '-');     // Replace multiple - with single -
}

export const actions = {
	createCategory: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const name = formData.get('name');

		if (!name) return { success: false, error: 'Name is required' };

		const slug = generateSlug(name);

		const { error } = await supabase
			.from('categories')
			.insert({ name, slug });

		if (error) {
			// Handle unique constraint violations easily
			if (error.code === '23505') {
				return { success: false, error: 'Kategori dengan nama ini sudah ada.' };
			}
			return { success: false, error: error.message };
		}
		
		return { success: true };
	},
	deleteCategory: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return { success: false, error: 'Missing ID' };

		const { error } = await supabase.from('categories').delete().eq('id', id);

		if (error) return { success: false, error: error.message };
		return { success: true };
	}
};
