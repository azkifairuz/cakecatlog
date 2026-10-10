import { fail } from '@sveltejs/kit';
import {
	getAdminBanners,
	createAdminBanner,
	bulkUpdateAdminBanners,
	deleteAdminBanner
} from '$lib/api/admin.js';
import { uploadBanner } from '$lib/api/upload.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export async function load({ locals, fetch, cookies }) {
	try {
		const banners = await getAdminBanners(locals.adminToken, fetch);
		const list = Array.isArray(banners) ? banners : banners?.banners || banners?.data || [];
		const normalized = list.map((b) => {
			const imgUrl = b.imageUrl || b.image_url || '';
			return {
				...b,
				imageUrl: imgUrl,
				image_url: imgUrl,
				display_order: b.displayOrder !== undefined ? b.displayOrder : (b.display_order ?? 0),
				displayOrder: b.displayOrder !== undefined ? b.displayOrder : (b.display_order ?? 0),
				is_active: b.isActive !== undefined ? Boolean(b.isActive) : (b.is_active !== undefined ? Boolean(b.is_active) : true),
				isActive: b.isActive !== undefined ? Boolean(b.isActive) : (b.is_active !== undefined ? Boolean(b.is_active) : true)
			};
		});
		return { banners: normalized };
	} catch (error) {
		handleAdminAuthError(error, cookies);
		console.error('Error fetching admin banners:', error);
		return { banners: [] };
	}
}

export const actions = {
	upload: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const image = formData.get('image');
		const is_active = formData.get('is_active') === 'on';

		if (!image || (image instanceof File && image.size === 0)) {
			return fail(400, { success: false, error: 'File gambar wajib diunggah.' });
		}

		try {
			const uploadResult = await uploadBanner(image, locals.adminToken, fetch);
			const imageUrl = uploadResult?.publicUrl || uploadResult?.imageUrl;

			if (!imageUrl) {
				return fail(500, { success: false, error: 'Gagal mendapatkan URL gambar banner.' });
			}

			await createAdminBanner(
				{
					imageUrl,
					isActive: is_active
				},
				locals.adminToken,
				fetch
			);

			return { success: true, message: 'Banner berhasil ditambahkan.' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Upload banner error:', err);
			return fail(err?.status || 500, {
				success: false,
				error: err?.message || 'Gagal mengunggah banner.'
			});
		}
	},

	update_all: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const bannersJson = formData.get('banners');

		if (!bannersJson) {
			return fail(400, { success: false, error: 'Data banner tidak ditemukan.' });
		}

		let rawBanners;
		try {
			rawBanners = JSON.parse(bannersJson);
		} catch {
			return fail(400, { success: false, error: 'Data banner tidak valid.' });
		}

		const banners = rawBanners.map((b) => ({
			id: String(b.id),
			displayOrder: Number(b.display_order ?? b.displayOrder ?? 0),
			isActive: b.is_active !== undefined ? Boolean(b.is_active) : Boolean(b.isActive)
		}));

		try {
			await bulkUpdateAdminBanners(banners, locals.adminToken, fetch);
			return { success: true, message: 'Perubahan berhasil disimpan.' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update all banners error:', err);
			return fail(err?.status || 500, {
				success: false,
				error: err?.message || 'Gagal memperbarui data banner.'
			});
		}
	},

	delete: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) {
			return fail(400, { success: false, error: 'ID banner tidak valid.' });
		}

		try {
			await deleteAdminBanner(id, locals.adminToken, fetch);
			return { success: true, message: 'Banner berhasil dihapus.' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete banner error:', err);
			return fail(err?.status || 500, {
				success: false,
				error: err?.message || 'Gagal menghapus banner.'
			});
		}
	}
};
