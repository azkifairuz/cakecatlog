import {
	getAdminOrderForms,
	getAdminProducts,
	getAdminSiteInfo,
	createAdminOrderForm,
	updateAdminOrderForm,
	toggleAdminOrderFormStatus,
	deleteAdminOrderForm
} from '$lib/api/admin.js';
import { adaptProducts } from '$lib/api/adapters.js';
import { normalizeSiteInfo } from '$lib/site-info.js';
import { slugify } from '$lib/order-forms.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
import { fail } from '@sveltejs/kit';

export const load = async ({ locals, fetch, cookies }) => {
	let productsRes, formsRes, siteInfoRes;
	try {
		[productsRes, formsRes, siteInfoRes] = await Promise.all([
			getAdminProducts({ pageSize: 100 }, locals.adminToken, fetch),
			getAdminOrderForms({ pageSize: 100 }, locals.adminToken, fetch),
			getAdminSiteInfo(locals.adminToken, fetch)
		]);
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Failed to load order forms page data:', err);
		productsRes = { items: [] };
		formsRes = { items: [] };
		siteInfoRes = null;
	}

	const rawProducts = productsRes?.items || productsRes?.products || [];
	const rawForms = formsRes?.items || formsRes?.orderForms || (Array.isArray(formsRes) ? formsRes : []);

	const orderForms = rawForms.map((f) => ({
		...f,
		product_id: f.productId !== undefined ? f.productId : f.product_id,
		is_active: f.isActive !== undefined ? f.isActive : f.is_active,
		views_count: f.viewsCount !== undefined ? f.viewsCount : f.views_count,
		orders_count: f.ordersCount !== undefined ? f.ordersCount : f.orders_count,
		banner_text: f.bannerText !== undefined ? f.bannerText : f.banner_text,
		created_at: f.createdAt !== undefined ? f.createdAt : f.created_at,
		updated_at: f.updatedAt !== undefined ? f.updatedAt : f.updated_at
	}));

	return {
		products: adaptProducts(rawProducts),
		orderForms,
		siteInfo: normalizeSiteInfo(siteInfoRes)
	};
};

export const actions = {
	createForm: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const title = String(formData.get('title') || '').trim();
		const rawSlug = String(formData.get('slug') || '').trim();
		const product_id = formData.get('product_id') || null;
		const description = String(formData.get('description') || '').trim() || null;
		const banner_text = String(formData.get('banner_text') || '').trim() || null;

		if (!title) {
			return fail(400, { success: false, error: 'Judul form pembelian wajib diisi.' });
		}

		const slug = slugify(rawSlug || title);
		if (!slug) {
			return fail(400, { success: false, error: 'Slug form tidak valid.' });
		}

		const payload = {
			title,
			slug,
			productId: product_id || null,
			description,
			bannerText: banner_text,
			isActive: true
		};

		try {
			const form = await createAdminOrderForm(payload, locals.adminToken, fetch);
			return { success: true, form };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create order form error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal membuat form pemesanan.'
			});
		}
	},

	updateForm: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const title = String(formData.get('title') || '').trim();
		const rawSlug = String(formData.get('slug') || '').trim();
		const product_id = formData.get('product_id') || null;
		const description = String(formData.get('description') || '').trim() || null;
		const banner_text = String(formData.get('banner_text') || '').trim() || null;

		if (!id || !title) {
			return fail(400, { success: false, error: 'ID dan Judul form wajib diisi.' });
		}

		const slug = slugify(rawSlug || title);
		if (!slug) {
			return fail(400, { success: false, error: 'Slug form tidak valid.' });
		}

		const payload = {
			title,
			slug,
			productId: product_id || null,
			description,
			bannerText: banner_text
		};

		try {
			await updateAdminOrderForm(id, payload, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update order form error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal memperbarui form.'
			});
		}
	},

	toggleStatus: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const is_active = formData.get('is_active') === 'true';

		if (!id) return fail(400, { success: false, error: 'ID form wajib diisi.' });

		try {
			await toggleAdminOrderFormStatus(id, !is_active, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Toggle status error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal mengubah status form.' });
		}
	},

	deleteForm: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = formData.get('id');

		if (!id) return fail(400, { success: false, error: 'ID form wajib diisi.' });

		try {
			await deleteAdminOrderForm(id, locals.adminToken, fetch);
			return { success: true };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete form error:', err);
			return fail(400, { success: false, error: err?.message || 'Gagal menghapus form.' });
		}
	}
};
