import { error as httpError } from '@sveltejs/kit';
import { getOrderForms, slugify } from '$lib/server/order-forms.js';
import { normalizeSiteInfo } from '$lib/site-info.js';

export const load = async ({ locals: { supabase } }) => {
	const [productsRes, forms, siteInfoRes] = await Promise.all([
		supabase
			.from('products')
			.select(`
				id,
				name,
				base_price,
				is_active,
				is_available,
				categories (
					id,
					name
				),
				product_images (
					image_url,
					is_primary
				)
			`)
			.eq('is_active', true)
			.order('name', { ascending: true }),
		getOrderForms(supabase),
		supabase.from('site_contact_info').select('*').eq('id', 'main').maybeSingle()
	]);

	if (productsRes.error) {
		console.error('Failed to load products for admin order forms:', productsRes.error);
	}

	return {
		products: productsRes.data ?? [],
		orderForms: forms,
		siteInfo: normalizeSiteInfo(siteInfoRes.data)
	};
};

export const actions = {
	createForm: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const title = String(formData.get('title') || '').trim();
		const rawSlug = String(formData.get('slug') || '').trim();
		const product_id = formData.get('product_id') || null;
		const description = String(formData.get('description') || '').trim() || null;
		const banner_text = String(formData.get('banner_text') || '').trim() || null;

		if (!title) {
			return { success: false, error: 'Judul form pembelian wajib diisi.' };
		}

		const slug = slugify(rawSlug || title);
		if (!slug) {
			return { success: false, error: 'Slug form tidak valid.' };
		}

		const payload = {
			title,
			slug,
			product_id: product_id || null,
			description,
			banner_text,
			is_active: true
		};

		const { data, error } = await supabase
			.from('order_forms')
			.insert(payload)
			.select()
			.single();

		if (error) {
			console.error('Create Order Form Error:', error);
			if (error.code === '23505') {
				return { success: false, error: 'Slug sudah digunakan oleh form lain. Gunakan slug yang berbeda.' };
			}
			return { success: false, error: error.message || 'Gagal membuat form pemesanan.' };
		}

		return { success: true, form: data };
	},

	updateForm: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const title = String(formData.get('title') || '').trim();
		const rawSlug = String(formData.get('slug') || '').trim();
		const product_id = formData.get('product_id') || null;
		const description = String(formData.get('description') || '').trim() || null;
		const banner_text = String(formData.get('banner_text') || '').trim() || null;

		if (!id || !title) {
			return { success: false, error: 'ID dan Judul form wajib diisi.' };
		}

		const slug = slugify(rawSlug || title);
		if (!slug) {
			return { success: false, error: 'Slug form tidak valid.' };
		}

		const { error } = await supabase
			.from('order_forms')
			.update({
				title,
				slug,
				product_id: product_id || null,
				description,
				banner_text,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) {
			console.error('Update Order Form Error:', error);
			if (error.code === '23505') {
				return { success: false, error: 'Slug sudah digunakan oleh form lain.' };
			}
			return { success: false, error: error.message };
		}

		return { success: true };
	},

	toggleStatus: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const is_active = formData.get('is_active') === 'true';

		if (!id) return { success: false, error: 'ID form wajib diisi.' };

		const { error } = await supabase
			.from('order_forms')
			.update({
				is_active,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (error) return { success: false, error: error.message };
		return { success: true };
	},

	deleteForm: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return { success: false, error: 'ID form wajib diisi.' };

		const { error } = await supabase
			.from('order_forms')
			.delete()
			.eq('id', id);

		if (error) return { success: false, error: error.message };
		return { success: true };
	}
};
