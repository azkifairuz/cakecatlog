import { error as httpError, fail } from '@sveltejs/kit';
import {
	getAdminExpenses,
	createAdminExpense,
	updateAdminExpense,
	deleteAdminExpense,
	getAdminExpenseCategories,
	createAdminExpenseCategory,
	updateAdminExpenseCategory,
	deleteAdminExpenseCategory
} from '$lib/api/admin.js';
import { adaptExpenses, adaptExpenseCategories, adaptExpenseCategory } from '$lib/api/adapters.js';
import { handleAdminAuthError } from '$lib/api/auth.js';

export const load = async ({ locals, fetch, cookies }) => {
	try {
		const [expensesResult, categoriesResult] = await Promise.all([
			getAdminExpenses(locals.adminToken, fetch).catch((err) => {
				console.warn('Unable to load expenses:', err);
				return [];
			}),
			getAdminExpenseCategories(locals.adminToken, fetch).catch((err) => {
				console.warn('Unable to load expense categories:', err);
				return [];
			})
		]);

		const rawExpenses = Array.isArray(expensesResult)
			? expensesResult
			: expensesResult?.expenses || expensesResult?.data || expensesResult?.items || [];
		const rawCategories = Array.isArray(categoriesResult)
			? categoriesResult
			: categoriesResult?.categories || categoriesResult?.data || categoriesResult?.items || [];

		const expenses = adaptExpenses(rawExpenses);
		const categories = adaptExpenseCategories(rawCategories);

		return {
			expenses,
			categories
		};
	} catch (err) {
		handleAdminAuthError(err, cookies);
		console.error('Unable to load expenses page data:', err);
		throw httpError(500, 'Data pengeluaran belum dapat dimuat.');
	}
};

export const actions = {
	createExpense: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();
		const categoryId = String(formData.get('categoryId') || formData.get('category_id') || '').trim();
		const amountRaw = String(formData.get('amount') || '').replace(/\D/g, '');
		const amount = amountRaw ? Number(amountRaw) : 0;

		if (!name) {
			return fail(400, { success: false, error: 'Keterangan / nama pengeluaran wajib diisi.' });
		}
		if (!categoryId) {
			return fail(400, { success: false, error: 'Kategori pengeluaran wajib dipilih.' });
		}
		if (amount <= 0) {
			return fail(400, { success: false, error: 'Nominal pengeluaran harus lebih besar dari 0.' });
		}

		const payload = {
			name,
			categoryId,
			category_id: categoryId,
			amount
		};

		try {
			await createAdminExpense(payload, locals.adminToken, fetch);
			return { success: true, message: 'Pengeluaran berhasil dicatat!' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create expense error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal mencatat pengeluaran.'
			});
		}
	},

	updateExpense: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const name = String(formData.get('name') || '').trim();
		const categoryId = String(formData.get('categoryId') || formData.get('category_id') || '').trim();
		const amountRaw = String(formData.get('amount') || '').replace(/\D/g, '');
		const amount = amountRaw ? Number(amountRaw) : 0;

		if (!id) {
			return fail(400, { success: false, error: 'ID pengeluaran tidak valid.' });
		}
		if (!name) {
			return fail(400, { success: false, error: 'Keterangan / nama pengeluaran wajib diisi.' });
		}
		if (!categoryId) {
			return fail(400, { success: false, error: 'Kategori pengeluaran wajib dipilih.' });
		}
		if (amount <= 0) {
			return fail(400, { success: false, error: 'Nominal pengeluaran harus lebih besar dari 0.' });
		}

		const payload = {
			name,
			categoryId,
			category_id: categoryId,
			amount
		};

		try {
			await updateAdminExpense(id, payload, locals.adminToken, fetch);
			return { success: true, message: 'Pengeluaran berhasil diperbarui!' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update expense error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal memperbarui pengeluaran.'
			});
		}
	},

	deleteExpense: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) {
			return fail(400, { success: false, error: 'ID pengeluaran tidak valid.' });
		}

		try {
			await deleteAdminExpense(id, locals.adminToken, fetch);
			return { success: true, message: 'Pengeluaran berhasil dihapus!' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete expense error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal menghapus pengeluaran.'
			});
		}
	},

	createCategory: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const name = String(formData.get('name') || '').trim();

		if (!name) {
			return fail(400, { success: false, error: 'Nama kategori pengeluaran wajib diisi.' });
		}

		try {
			const categoriesResult = await getAdminExpenseCategories(locals.adminToken, fetch);
			const existingCategories = Array.isArray(categoriesResult)
				? categoriesResult
				: categoriesResult?.categories || categoriesResult?.data || categoriesResult?.items || [];
			const existing = existingCategories.find(
				(category) => String(category.name || '').trim().toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID')
			);
			if (existing) {
				return {
					success: true,
					message: `Kategori "${existing.name}" sudah tersedia.`,
					category: adaptExpenseCategory(existing)
				};
			}
			const result = await createAdminExpenseCategory({ name }, locals.adminToken, fetch);
			const category = adaptExpenseCategory(result?.data || result?.category || result);
			return {
				success: true,
				message: `Kategori "${name}" berhasil dibuat!`,
				category
			};
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Create expense category error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal membuat kategori pengeluaran.'
			});
		}
	},

	updateCategory: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const name = String(formData.get('name') || '').trim();

		if (!id || !name) {
			return fail(400, { success: false, error: 'Data kategori tidak lengkap.' });
		}

		try {
			await updateAdminExpenseCategory(id, { name }, locals.adminToken, fetch);
			return { success: true, message: 'Kategori pengeluaran berhasil diperbarui!' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Update expense category error:', err);
			return fail(400, {
				success: false,
				error: err?.message || 'Gagal memperbarui kategori pengeluaran.'
			});
		}
	},

	deleteCategory: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) {
			return fail(400, { success: false, error: 'ID kategori tidak valid.' });
		}

		try {
			await deleteAdminExpenseCategory(id, locals.adminToken, fetch);
			return { success: true, message: 'Kategori pengeluaran berhasil dihapus!' };
		} catch (err) {
			handleAdminAuthError(err, cookies);
			console.error('Delete expense category error:', err);
			const isConflict = err?.status === 409 || String(err?.message || '').toLowerCase().includes('conflict');
			return fail(400, {
				success: false,
				error: isConflict
					? 'Kategori tidak dapat dihapus karena masih digunakan oleh catatan pengeluaran.'
					: err?.message || 'Gagal menghapus kategori pengeluaran.'
			});
		}
	}
};
