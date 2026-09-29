/**
 * Helper utilities for Employee & Role management
 */

export const PERMISSION_CATEGORY_METAS = {
	order: { label: 'Pesanan (Orders)', icon: 'ShoppingCart', order: 1 },
	product: { label: 'Produk & Varian', icon: 'Package', order: 2 },
	category: { label: 'Kategori Produk', icon: 'Tags', order: 3 },
	addon: { label: 'Addons & Topping', icon: 'ListPlus', order: 4 },
	expense: { label: 'Pengeluaran Operasional', icon: 'Wallet', order: 5 },
	banner: { label: 'Banner & Promo', icon: 'Image', order: 6 },
	'site-info': { label: 'Informasi Toko', icon: 'Store', order: 7 },
	site: { label: 'Informasi Toko', icon: 'Store', order: 7 },
	whatsapp: { label: 'WhatsApp Gateway', icon: 'MessageCircle', order: 8 },
	'order-form': { label: 'Form Pemesanan', icon: 'FileText', order: 9 },
	role: { label: 'Role & Hak Akses', icon: 'ShieldCheck', order: 10 },
	admin: { label: 'Manajemen Karyawan/Admin', icon: 'Users', order: 11 },
	log: { label: 'Log Aktivitas Audit', icon: 'History', order: 12 },
	other: { label: 'Lainnya', icon: 'Layers', order: 99 }
};

/**
 * Groups a flat list of permissions by category based on their key prefix (e.g. "order.read" -> "order")
 * @param {Array<{ id: string, key: string, name: string }>} permissions
 * @returns {Array<{ categoryKey: string, label: string, icon: string, permissions: Array }>}
 */
export function groupPermissionsByCategory(permissions = []) {
	if (!Array.isArray(permissions)) return [];

	const groupsMap = {};

	for (const perm of permissions) {
		if (!perm || !perm.key) continue;

		const parts = perm.key.split('.');
		const rawCategory = parts[0]?.toLowerCase() || 'other';
		const categoryKey = PERMISSION_CATEGORY_METAS[rawCategory] ? rawCategory : 'other';

		if (!groupsMap[categoryKey]) {
			const meta = PERMISSION_CATEGORY_METAS[categoryKey] || PERMISSION_CATEGORY_METAS.other;
			groupsMap[categoryKey] = {
				categoryKey,
				label: meta.label,
				icon: meta.icon,
				order: meta.order,
				permissions: []
			};
		}

		groupsMap[categoryKey].permissions.push({
			id: perm.id || perm.key,
			key: perm.key,
			name: perm.name || perm.key,
			raw: perm
		});
	}

	return Object.values(groupsMap).sort((a, b) => a.order - b.order);
}

/**
 * Validates employee input fields
 * @param {{ email?: string, username?: string, password?: string, isEdit?: boolean }} input
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateEmployeeInput({ email, username, password, isEdit = false }) {
	const trimmedEmail = String(email || '').trim();
	const trimmedUsername = String(username || '').trim();
	const trimmedPassword = String(password || '').trim();

	if (!trimmedEmail) {
		return { isValid: false, error: 'Email wajib diisi.' };
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(trimmedEmail)) {
		return { isValid: false, error: 'Format email tidak valid.' };
	}

	if (!trimmedUsername) {
		return { isValid: false, error: 'Username wajib diisi.' };
	}

	if (trimmedUsername.length < 3) {
		return { isValid: false, error: 'Username minimal 3 karakter.' };
	}

	if (!isEdit && !trimmedPassword) {
		return { isValid: false, error: 'Password wajib diisi.' };
	}

	if (trimmedPassword && trimmedPassword.length < 8) {
		return { isValid: false, error: 'Password minimal 8 karakter.' };
	}

	return { isValid: true };
}

/**
 * Validates role input
 * @param {{ name?: string }} input
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateRoleInput({ name }) {
	const trimmedName = String(name || '').trim();
	if (!trimmedName) {
		return { isValid: false, error: 'Nama role wajib diisi.' };
	}
	if (trimmedName.length < 2) {
		return { isValid: false, error: 'Nama role minimal 2 karakter.' };
	}
	return { isValid: true };
}

/**
 * Returns role badge presentation meta
 * @param {string} roleName
 * @returns {{ label: string, badgeClass: string, isSuperAdmin: boolean }}
 */
export function getRoleBadgeMeta(roleName = '') {
	const lower = String(roleName || '').toLowerCase().trim();
	const isSuperAdmin = lower === 'super_admin' || lower === 'superadmin';

	if (isSuperAdmin) {
		return {
			label: 'Super Admin',
			badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
			isSuperAdmin: true
		};
	}

	if (lower === 'admin') {
		return {
			label: 'Admin',
			badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
			isSuperAdmin: false
		};
	}

	if (lower === 'cashier' || lower === 'kasir') {
		return {
			label: 'Kasir',
			badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
			isSuperAdmin: false
		};
	}

	if (lower === 'kitchen' || lower === 'dapur') {
		return {
			label: 'Dapur',
			badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
			isSuperAdmin: false
		};
	}

	return {
		label: roleName || 'Karyawan',
		badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
		isSuperAdmin: false
	};
}
