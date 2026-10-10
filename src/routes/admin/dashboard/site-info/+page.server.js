import { fail } from '@sveltejs/kit';
import { normalizeSiteInfo } from '$lib/site-info.js';
import { getAdminSiteInfo, updateAdminSiteInfo } from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, fetch, cookies }) => {
	try {
		const siteInfo = await getAdminSiteInfo(locals.adminToken, fetch);
		return {
			siteInfo: normalizeSiteInfo(siteInfo),
			setupError: null
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Failed to load site info:', err);
		return {
			siteInfo: normalizeSiteInfo(),
			setupError: err?.message ?? 'Gagal memuat info toko'
		};
	}
};

function clean(value) {
	return String(value ?? '').trim();
}

export const actions = {
	saveSiteInfo: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const payload = {
			pickupDays: clean(formData.get('pickup_days')),
			pickupStoreHours: clean(formData.get('pickup_store_hours')),
			pickupManagerHours: clean(formData.get('pickup_manager_hours')),
			address: clean(formData.get('address')),
			whatsappNumber: clean(formData.get('whatsapp_number'))
		};

		const legacyPayload = {
			id: 'main',
			pickup_days: payload.pickupDays,
			pickup_store_hours: payload.pickupStoreHours,
			pickup_manager_hours: payload.pickupManagerHours,
			address: payload.address,
			whatsapp_number: payload.whatsappNumber
		};

		if (!payload.pickupDays || !payload.address || !payload.whatsappNumber) {
			return fail(400, {
				error: 'Pickup days, alamat, dan nomor WhatsApp wajib diisi.',
				values: legacyPayload
			});
		}

		try {
			await updateAdminSiteInfo(payload, locals.adminToken, fetch);
			return {
				success: true
			};
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Save site info error:', err);
			return fail(500, {
				error: `Gagal menyimpan info toko: ${err.message}`,
				values: legacyPayload
			});
		}
	}
};
