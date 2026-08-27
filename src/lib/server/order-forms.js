export { slugify, buildFormUrl, buildWhatsAppShareMessage } from '../order-forms.js';

export async function getOrderForms(supabase) {
	try {
		const { data, error } = await supabase
			.from('order_forms')
			.select(`
				*,
				products (
					id,
					name,
					base_price,
					is_active,
					is_available,
					product_images (
						image_url,
						is_primary
					)
				)
			`)
			.order('created_at', { ascending: false });

		if (error) {
			console.warn('Could not query order_forms table (might not exist yet):', error.message);
			return [];
		}

		return data ?? [];
	} catch (err) {
		console.warn('getOrderForms exception:', err);
		return [];
	}
}

export async function getOrderFormBySlug(supabase, slug) {
	if (!slug) return null;

	try {
		const { data, error } = await supabase
			.from('order_forms')
			.select(`
				*,
				products (
					id,
					name,
					base_price,
					description,
					handling_warning,
					is_active,
					is_available,
					product_variants (
						id,
						name,
						price,
						is_active,
						display_order
					),
					product_addons (
						addon_id,
						is_active
					),
					product_images (
						image_url,
						is_primary
					),
					categories (
						id,
						name
					)
				)
			`)
			.eq('slug', slug)
			.eq('is_active', true)
			.maybeSingle();

		if (error) {
			console.warn('Could not query order form by slug:', error.message);
			return null;
		}

		return data;
	} catch (err) {
		console.warn('getOrderFormBySlug exception:', err);
		return null;
	}
}
