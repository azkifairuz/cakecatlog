import { parsePrice } from '$lib/pricing.js';
import { fail } from '@sveltejs/kit';
import {
	getAdminAddons,
	createAdminAddon,
	updateAdminAddon,
	toggleAdminAddon,
	deleteAdminAddon
} from '$lib/api/admin.js';
import { adaptAddons } from '$lib/api/adapters.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, fetch, cookies }) => {
	try {
		const addons = await getAdminAddons(locals.adminToken, fetch);
		return {
			addons: adaptAddons(addons)
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Failed to load admin addons:', err);
		return {
			addons: [],
			error: err?.message || 'Gagal memuat addons'
		};
	}
};

function getPayload(formData) {
	const category = String(formData.get('category') || '').trim();
	const name = String(formData.get('name') || '').trim();
	const is_dark_color = formData.get('is_dark_color') === 'on';

	return {
		category,
		name,
		additionalPrice: parsePrice(formData.get('additional_price')),
		isDarkColor: is_dark_color,
		darkColorSurcharge: is_dark_color ? parsePrice(formData.get('dark_color_surcharge')) : 0,
		isActive: formData.get('is_active') === 'on'
	};
}

export const actions = {
	createAddon: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const payload = getPayload(formData);

		if (!payload.category || !payload.name) {
			return fail(400, { success: false, error: 'Category dan nama wajib diisi' });
		}

		try {
			await createAdminAddon(payload, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create addon error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal membuat addon' });
		}
	},
	updateAddon: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const payload = getPayload(formData);

		if (!id || !payload.category || !payload.name) {
			return fail(400, { success: false, error: 'ID, category, dan nama wajib diisi' });
		}

		try {
			await updateAdminAddon(id, payload, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update addon error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal memperbarui addon' });
		}
	},
	toggleAddon: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const is_active = formData.get('is_active') === 'true';

		if (!id) return fail(400, { success: false, error: 'Missing ID' });

		try {
			await toggleAdminAddon(id, !is_active, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Toggle addon error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal mengubah status addon' });
		}
	},
	deleteAddon: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return fail(400, { success: false, error: 'Missing ID' });

		try {
			await deleteAdminAddon(id, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete addon error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal menghapus addon' });
		}
	}
};
