import { parsePrice } from '$lib/pricing.js';

export const load = async ({ locals: { supabase } }) => {
	const { data: addons, error } = await supabase
		.from('global_addons')
		.select('*')
		.order('category')
		.order('created_at', { ascending: false });

	if (error) {
		return { addons: [], error: error.message };
	}

	return {
		addons: addons ?? []
	};
};

function getPayload(formData) {
	const category = String(formData.get('category') || '').trim();
	const name = String(formData.get('name') || '').trim();
	const is_dark_color = formData.get('is_dark_color') === 'on';

	return {
		category,
		name,
		additional_price: parsePrice(formData.get('additional_price')),
		is_dark_color,
		dark_color_surcharge: is_dark_color ? parsePrice(formData.get('dark_color_surcharge')) : 0,
		is_active: formData.get('is_active') === 'on'
	};
}

export const actions = {
	createAddon: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const payload = getPayload(formData);

		if (!payload.category || !payload.name) {
			return { success: false, error: 'Category dan nama wajib diisi' };
		}

		const { error } = await supabase.from('global_addons').insert(payload);
		if (error) return { success: false, error: error.message };

		return { success: true };
	},
	updateAddon: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const payload = getPayload(formData);

		if (!id || !payload.category || !payload.name) {
			return { success: false, error: 'ID, category, dan nama wajib diisi' };
		}

		const { error } = await supabase.from('global_addons').update(payload).eq('id', id);
		if (error) return { success: false, error: error.message };

		return { success: true };
	},
	toggleAddon: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const is_active = formData.get('is_active') === 'true';

		if (!id) return { success: false, error: 'Missing ID' };

		const { error } = await supabase
			.from('global_addons')
			.update({ is_active: !is_active })
			.eq('id', id);

		if (error) return { success: false, error: error.message };
		return { success: true };
	},
	deleteAddon: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return { success: false, error: 'Missing ID' };

		const { error } = await supabase.from('global_addons').delete().eq('id', id);
		if (error) return { success: false, error: error.message };

		return { success: true };
	}
};
