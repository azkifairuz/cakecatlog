import { fail } from '@sveltejs/kit';

export async function load({ locals: { supabase } }) {
	const { data: banners, error } = await supabase
		.from('hero_banners')
		.select('*')
		.order('display_order', { ascending: true })
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching banners:', error);
		return { banners: [] };
	}

	return { banners };
}

export const actions = {
	upload: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const image = formData.get('image');
		const is_active = formData.get('is_active') === 'on';

		if (!image || image.size === 0) {
			return fail(400, { success: false, error: 'File gambar wajib diunggah.' });
		}

		// Validation 2-5 active banners
		if (is_active) {
			const { count, error: countError } = await supabase
				.from('hero_banners')
				.select('*', { count: 'exact', head: true })
				.eq('is_active', true);

			if (countError) {
				return fail(500, { success: false, error: 'Gagal mengecek status banner aktif.' });
			}

			if (count >= 5) {
				return fail(400, { success: false, error: 'Maksimal 5 banner aktif. Silakan nonaktifkan banner lain terlebih dahulu atau unggah sebagai tidak aktif.' });
			}
		}

		// Get max display order
		const { data: maxOrderData } = await supabase
			.from('hero_banners')
			.select('display_order')
			.order('display_order', { ascending: false })
			.limit(1)
			.single();
		
		const nextOrder = (maxOrderData?.display_order || 0) + 1;

		// Upload image
		const fileExt = image.name.split('.').pop();
		const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
		const filePath = `${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('banners')
			.upload(filePath, image);

		if (uploadError) {
			return fail(500, { success: false, error: 'Gagal mengunggah gambar ke storage: ' + uploadError.message });
		}

		const { data: publicUrlData } = supabase.storage
			.from('banners')
			.getPublicUrl(filePath);

		const { error: insertError } = await supabase
			.from('hero_banners')
			.insert({
				image_url: publicUrlData.publicUrl,
				display_order: nextOrder,
				is_active
			});

		if (insertError) {
			return fail(500, { success: false, error: 'Gagal menyimpan data banner ke database.' });
		}

		return { success: true, message: 'Banner berhasil ditambahkan.' };
	},

	update_all: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const bannersJson = formData.get('banners');

		if (!bannersJson) {
			return fail(400, { success: false, error: 'Data banner tidak ditemukan.' });
		}

		let banners;
		try {
			banners = JSON.parse(bannersJson);
		} catch (e) {
			return fail(400, { success: false, error: 'Data banner tidak valid.' });
		}

		const activeCount = banners.filter(b => b.is_active).length;

		if (activeCount < 2) {
			return fail(400, { success: false, error: 'Minimal harus ada 2 banner yang aktif.' });
		}
		if (activeCount > 5) {
			return fail(400, { success: false, error: 'Maksimal hanya boleh 5 banner yang aktif.' });
		}

		// Upsert all banners
		const updates = banners.map(b => ({
			id: b.id,
			image_url: b.image_url,
			display_order: b.display_order,
			is_active: b.is_active
		}));

		const { error } = await supabase
			.from('hero_banners')
			.upsert(updates, { onConflict: 'id' });

		if (error) {
			return fail(500, { success: false, error: 'Gagal memperbarui data banner: ' + error.message });
		}

		return { success: true, message: 'Perubahan berhasil disimpan.' };
	},

	delete: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const image_url = formData.get('image_url');

		if (!id) {
			return fail(400, { success: false, error: 'ID banner tidak valid.' });
		}

		// Get the banner being deleted to check if it's active
		const { data: bannerToDelete } = await supabase
			.from('hero_banners')
			.select('is_active')
			.eq('id', id)
			.single();

		if (bannerToDelete?.is_active) {
			// Count active banners
			const { count } = await supabase
				.from('hero_banners')
				.select('*', { count: 'exact', head: true })
				.eq('is_active', true);
			
			if (count <= 2) {
				return fail(400, { success: false, error: 'Tidak dapat menghapus banner ini karena minimal harus ada 2 banner aktif. Nonaktifkan banner lain atau tambahkan banner baru terlebih dahulu.' });
			}
		}

		// Extract filename from URL
		if (image_url) {
			try {
				const urlParts = image_url.split('/');
				const fileName = urlParts[urlParts.length - 1];
				
				if (fileName) {
					await supabase.storage.from('banners').remove([fileName]);
				}
			} catch (e) {
				console.error('Error parsing image URL for deletion:', e);
			}
		}

		const { error } = await supabase
			.from('hero_banners')
			.delete()
			.eq('id', id);

		if (error) {
			return fail(500, { success: false, error: 'Gagal menghapus banner dari database.' });
		}

		return { success: true, message: 'Banner berhasil dihapus.' };
	}
};
