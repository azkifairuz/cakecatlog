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
	const visible = source.filter((menu) => menu?.isActive !== false && menu?.url);
	if ((isSuperAdmin || admin?.permissions?.includes('menu.manage')) && !visible.some((menu) => menu.url === '/admin/dashboard/menus')) {
		visible.push(fallbackMenus.find((menu) => menu.url === '/admin/dashboard/menus'));
	}
	return visible.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}
