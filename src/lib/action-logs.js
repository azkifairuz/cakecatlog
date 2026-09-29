/**
 * Helper dan normalizer untuk data Action Log Admin
 */

export const ACTION_MENUS = [
	{ id: 'All', label: 'Semua Menu' },
	{ id: 'Product', label: 'Produk' },
	{ id: 'Order', label: 'Pesanan' },
	{ id: 'Category', label: 'Kategori' },
	{ id: 'Addon', label: 'Addon' },
	{ id: 'Banner', label: 'Banner' },
	{ id: 'SiteInfo', label: 'Info Toko' },
	{ id: 'WhatsApp', label: 'WhatsApp' },
	{ id: 'InvoiceTemplate', label: 'Template Invoice' }
];

export function detectActionType(message = '', menu = '') {
	const text = `${message} ${menu}`.toLowerCase();
	if (text.includes('delete') || text.includes('hapus') || text.includes('remove')) {
		return 'delete';
	}
	if (text.includes('create') || text.includes('tambah') || text.includes('buat') || text.includes('new')) {
		return 'create';
	}
	if (text.includes('update') || text.includes('ubah') || text.includes('edit') || text.includes('toggle') || text.includes('status')) {
		return 'update';
	}
	if (text.includes('login') || text.includes('logout') || text.includes('auth')) {
		return 'auth';
	}
	return 'general';
}

export function getActionTypeMeta(actionType) {
	switch (actionType) {
		case 'create':
			return {
				label: 'Dibuat',
				color: 'emerald',
				bgClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300',
				dotClass: 'bg-emerald-500'
			};
		case 'update':
			return {
				label: 'Diperbarui',
				color: 'sky',
				bgClass: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:bg-sky-950/40 dark:text-sky-300',
				dotClass: 'bg-sky-500'
			};
		case 'delete':
			return {
				label: 'Dihapus',
				color: 'rose',
				bgClass: 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300',
				dotClass: 'bg-rose-500'
			};
		case 'auth':
			return {
				label: 'Autentikasi',
				color: 'violet',
				bgClass: 'bg-violet-500/10 text-violet-700 border-violet-500/20 dark:bg-violet-950/40 dark:text-violet-300',
				dotClass: 'bg-violet-500'
			};
		default:
			return {
				label: 'Aktivitas',
				color: 'slate',
				bgClass: 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
				dotClass: 'bg-slate-400'
			};
	}
}

export function getMenuMeta(menu = '') {
	const normalized = String(menu || '').toLowerCase();
	if (normalized.includes('product')) {
		return { label: 'Produk', color: 'emerald', icon: 'Package' };
	}
	if (normalized.includes('order')) {
		return { label: 'Pesanan', color: 'amber', icon: 'ShoppingCart' };
	}
	if (normalized.includes('category')) {
		return { label: 'Kategori', color: 'purple', icon: 'Tags' };
	}
	if (normalized.includes('addon')) {
		return { label: 'Addon', color: 'blue', icon: 'ListPlus' };
	}
	if (normalized.includes('banner')) {
		return { label: 'Banner', color: 'pink', icon: 'Image' };
	}
	if (normalized.includes('site') || normalized.includes('info')) {
		return { label: 'Info Toko', color: 'indigo', icon: 'Store' };
	}
	if (normalized.includes('whatsapp') || normalized.includes('invoice')) {
		return { label: 'WhatsApp', color: 'teal', icon: 'MessageCircle' };
	}
	return { label: menu || 'Umum', color: 'slate', icon: 'Activity' };
}

export function formatLogTime(dateString) {
	if (!dateString) return '-';
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return '-';

	return new Intl.DateTimeFormat('id-ID', {
		timeZone: 'Asia/Jakarta',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(date) + ' WIB';
}

export function formatLogDate(dateString) {
	if (!dateString) return '-';
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return '-';

	return new Intl.DateTimeFormat('id-ID', {
		timeZone: 'Asia/Jakarta',
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	}).format(date);
}

export function formatLogDateTime(dateString) {
	if (!dateString) return '-';
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return '-';

	return new Intl.DateTimeFormat('id-ID', {
		timeZone: 'Asia/Jakarta',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(date) + ' WIB';
}

export function formatRelativeTime(dateString, referenceDate = new Date()) {
	if (!dateString) return '-';
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return '-';

	const diffSeconds = Math.floor((referenceDate.getTime() - date.getTime()) / 1000);
	if (diffSeconds < 60) {
		return 'Baru saja';
	}
	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) {
		return `${diffMinutes} menit lalu`;
	}
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) {
		return `${diffHours} jam lalu`;
	}
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays === 1) {
		return 'Kemarin';
	}
	if (diffDays < 7) {
		return `${diffDays} hari lalu`;
	}
	return formatLogDate(dateString);
}

export function adaptActionLog(raw = {}) {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const dateValue = raw.createdAt || raw.tanggal || raw.created_at || new Date().toISOString();
	const menu = raw.menu || 'Umum';
	const message = raw.message || raw.description || '-';
	const actionType = detectActionType(message, menu);

	const userRaw = raw.user || {};
	const user = {
		id: userRaw.id || raw.adminUserId || raw.userId || '',
		username: userRaw.username || userRaw.displayName || userRaw.name || 'Admin',
		displayName: userRaw.displayName || userRaw.username || userRaw.name || 'Admin',
		email: userRaw.email || ''
	};

	// Get user initials for avatar
	const nameParts = (user.displayName || user.username || 'AD').trim().split(/\s+/);
	const initials = nameParts.length > 1
		? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
		: (user.displayName || 'AD').slice(0, 2).toUpperCase();

	return {
		id: raw.id || `log-${Math.random().toString(36).slice(2, 9)}`,
		menu,
		message,
		actionType,
		actionMeta: getActionTypeMeta(actionType),
		menuMeta: getMenuMeta(menu),
		user: {
			...user,
			initials
		},
		createdAt: dateValue,
		timeString: formatLogTime(dateValue),
		dateString: formatLogDate(dateValue),
		fullDateTimeString: formatLogDateTime(dateValue),
		relativeTime: formatRelativeTime(dateValue)
	};
}

export function adaptActionLogs(items = []) {
	if (!Array.isArray(items)) return [];
	return items.map(adaptActionLog).filter(Boolean);
}

export function groupLogsByDate(logs = []) {
	const groups = new Map();

	for (const log of logs) {
		const key = log.dateString || 'Lainnya';
		if (!groups.has(key)) {
			groups.set(key, {
				date: key,
				items: []
			});
		}
		groups.get(key).items.push(log);
	}

	return Array.from(groups.values());
}
