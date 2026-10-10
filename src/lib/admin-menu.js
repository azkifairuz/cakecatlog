// Menu lokal hanya untuk bootstrap ketika database menu belum diisi.
export const fallbackMenus = [
	['Analytics', '/admin/dashboard', 'ChartBar'],
	['Orders', '/admin/dashboard/orders', 'ShoppingCart'],
	['Form Pembelian', '/admin/dashboard/order-forms', 'FileText'],
	['Notifikasi', '/admin/dashboard/notifications', 'Bell'],
	['Products', '/admin/dashboard/products', 'Package'],
	['Categories', '/admin/dashboard/categories', 'Tags'],
	['Addons', '/admin/dashboard/addons', 'ListPlus'],
	['Banners', '/admin/dashboard/banners', 'Image'],
	['Pengeluaran', '/admin/dashboard/expenses', 'Wallet'],
	['Karyawan', '/admin/dashboard/employees', 'Users'],
	['Role & Akses', '/admin/dashboard/roles', 'ShieldCheck'],
	['Menu', '/admin/dashboard/menus', 'Menu'],
	['Info Toko', '/admin/dashboard/site-info', 'Info'],
	['WhatsApp', '/admin/dashboard/whatsapp', 'MessageCircle'],
	['Log Aktivitas', '/admin/dashboard/logs', 'History']
].map(([name, url, icon], index) => ({ name, url, icon, displayOrder: index + 1 }));

export function adminMenuUrl(url) {
	if (typeof url !== 'string' || !url.startsWith('/admin/')) return null;
	if (url === '/admin/action-logs' || url === '/admin/dashboard/action-logs') return '/admin/dashboard/logs';
	if (url === '/admin/uploads' || url === '/admin/dashboard/uploads') return null;
	if (url === '/admin/dashboard' || url.startsWith('/admin/dashboard/')) return url;
	if (url === '/admin/login' || url === '/admin/logout') return null;
	return `/admin/dashboard/${url.slice('/admin/'.length)}`;
}

export function visibleAdminMenus(admin) {
	const menus = Array.isArray(admin?.menus) ? admin.menus : [];
	const isSuperAdmin = admin?.role === 'super_admin' || admin?.permissions?.includes('*');
	const normalized = menus.map((menu) => ({ ...menu, url: adminMenuUrl(menu?.url) })).filter((menu) => menu.url);
	const source = isSuperAdmin
		? [...fallbackMenus, ...normalized.filter((menu) => !fallbackMenus.some((local) => local.url === menu.url))]
		: menus.length ? normalized : fallbackMenus;
	const seen = new Set();
	const visible = source.filter((menu) => {
		if (menu?.isActive === false || !menu?.url || seen.has(menu.url)) return false;
		seen.add(menu.url);
		return true;
	});
	if ((isSuperAdmin || admin?.permissions?.includes('menu.manage')) && !visible.some((menu) => menu.url === '/admin/dashboard/menus')) {
		visible.push(fallbackMenus.find((menu) => menu.url === '/admin/dashboard/menus'));
	}
	return visible.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

// Group only menus already granted to the current admin.
export function groupAdminNavItems(navItems) {
	const definitions = [
		{ id: 'catalog', label: 'Katalog', paths: ['products', 'categories', 'addons', 'banners'] },
		{ id: 'operations', label: 'Operasional', paths: ['expenses', 'employees'] },
		{ id: 'settings', label: 'Pengaturan', paths: ['roles', 'menus', 'site-info', 'whatsapp', 'logs'] }
	];
	const groupedPaths = new Set(definitions.flatMap((group) => group.paths.map((path) => `/admin/dashboard/${path}`)));
	return {
		primary: navItems.filter((item) => !groupedPaths.has(item.href)),
		groups: definitions.map((group) => ({
			id: group.id,
			label: group.label,
			items: navItems.filter((item) => group.paths.some((path) => item.href === `/admin/dashboard/${path}`))
		})).filter((group) => group.items.length)
	};
}
