import { fail } from '@sveltejs/kit';
import { normalizeSiteInfo } from '$lib/site-info.js';

export const load = async ({ locals: { supabase } }) => {
	const { data: siteInfo, error } = await supabase
		.from('site_contact_info')
		.select('*')
		.eq('id', 'main')
		.maybeSingle();

	return {
		siteInfo: normalizeSiteInfo(siteInfo),
		setupError: error?.message ?? null
	};
};

function clean(value) {
	return String(value ?? '').trim();
}

export const actions = {
	saveSiteInfo: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const payload = {
			id: 'main',
			pickup_days: clean(formData.get('pickup_days')),
			pickup_store_hours: clean(formData.get('pickup_store_hours')),
			pickup_manager_hours: clean(formData.get('pickup_manager_hours')),
			address: clean(formData.get('address')),
			whatsapp_number: clean(formData.get('whatsapp_number')),
			updated_at: new Date().toISOString()
		};

		if (!payload.pickup_days || !payload.address || !payload.whatsapp_number) {
			return fail(400, {
				error: 'Pickup days, alamat, dan nomor WhatsApp wajib diisi.',
				values: payload
			});
		}

		const { error } = await supabase
			.from('site_contact_info')
			.upsert(payload, { onConflict: 'id' });

		if (error) {
			return fail(500, {
				error: `Gagal menyimpan info toko: ${error.message}`,
				values: payload
			});
		}

		return {
			success: true
		};
	}
};
