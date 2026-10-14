import test from 'node:test';
import assert from 'node:assert/strict';
import { adminMenuUrl, visibleAdminMenus, groupAdminNavItems, fallbackMenus } from '../src/lib/admin-menu.js';

test('legacy and malformed dashboard Action Logs links resolve to the existing logs page', () => {
	for (const url of ['/admin/action-logs', '/admin/dashboard/action-logs', '/admin/dashboard/logs']) {
		assert.equal(adminMenuUrl(url), '/admin/dashboard/logs');
	}
	assert.equal(adminMenuUrl('/admin/orders'), '/admin/dashboard/orders');
	assert.equal(adminMenuUrl('/admin/uploads'), null);
});

test('super admin sees one logs menu despite duplicate database aliases', () => {
	const menus = visibleAdminMenus({ role: 'super_admin', menus: [
		{ name: 'Action Logs', url: '/admin/action-logs' },
		{ name: 'Logs', url: '/admin/dashboard/action-logs' },
		{ name: 'Menu', url: '/admin/menus' }
	] });
	assert.equal(menus.length, fallbackMenus.length);
	assert.equal(menus.filter((menu) => menu.url === '/admin/dashboard/logs').length, 1);
});

test('restricted admins retain granted active menus plus account API key and remove duplicates', () => {
	const menus = visibleAdminMenus({ role: 'admin', menus: [
		{ name: 'Disabled', url: '/admin/action-logs', isActive: false },
		{ name: 'Logs', url: '/admin/action-logs', displayOrder: 2 },
		{ name: 'Duplicate', url: '/admin/dashboard/logs', displayOrder: 3 },
		{ name: 'Orders', url: '/admin/orders', displayOrder: 1 }
	] });
	assert.deepEqual(menus.map((menu) => menu.url), ['/admin/dashboard/orders', '/admin/dashboard/logs', '/admin/dashboard/api-keys']);
	const grouped = groupAdminNavItems(menus.map((menu) => ({ href: menu.url })));
	assert.deepEqual(grouped.groups.map((group) => group.id), ['settings']);
	assert.equal(grouped.groups[0].items.length, 2);
});

test('grouping preserves every available menu exactly once including custom menus', () => {
	const items = [...fallbackMenus.map((menu) => ({ href: menu.url })), { href: '/admin/dashboard/custom' }];
	const { primary, groups } = groupAdminNavItems(items);
	assert.equal(primary.length + groups.length, 8);
	assert.deepEqual([...primary, ...groups.flatMap((group) => group.items)].map((item) => item.href).sort(), items.map((item) => item.href).sort());
	assert.ok(primary.some((item) => item.href === '/admin/dashboard/custom'));
	assert.deepEqual(groupAdminNavItems([]), { primary: [], groups: [] });
});
