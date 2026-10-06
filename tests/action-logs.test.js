import test from 'node:test';
import assert from 'node:assert/strict';
import {
	detectActionType,
	getActionTypeMeta,
	getMenuMeta,
	adaptActionLog,
	adaptActionLogs,
	groupLogsByDate,
	formatLogTime,
	formatLogDate
} from '../src/lib/action-logs.js';

test('detectActionType identifies create, update, delete, and auth actions accurately', () => {
	assert.strictEqual(detectActionType('Product created: Bento Cake', 'Product'), 'create');
	assert.strictEqual(detectActionType('Tambah produk baru', 'Product'), 'create');
	assert.strictEqual(detectActionType('Order updated: Status changed to Selesai', 'Order'), 'update');
	assert.strictEqual(detectActionType('Ubah harga produk', 'Product'), 'update');
	assert.strictEqual(detectActionType('Banner deleted: Promo September', 'Banner'), 'delete');
	assert.strictEqual(detectActionType('Hapus addon lilin', 'Addon'), 'delete');
	assert.strictEqual(detectActionType('User login successful', 'Auth'), 'auth');
	assert.strictEqual(detectActionType('Broadcast message sent', 'WhatsApp'), 'general');
});

test('adaptActionLog normalizes raw backend log item into rich presentation model', () => {
	const raw = {
		id: 'log-123',
		menu: 'Product',
		user: {
			id: 'admin-1',
			username: 'superadmin',
			email: 'owner@dessertbyfir.com',
			displayName: 'Owner Fir'
		},
		message: 'Product created: Bento Cake 10cm',
		createdAt: '2026-09-27T04:00:00.000Z'
	};

	const adapted = adaptActionLog(raw);
	assert.strictEqual(adapted.id, 'log-123');
	assert.strictEqual(adapted.menu, 'Product');
	assert.strictEqual(adapted.message, 'Product created: Bento Cake 10cm');
	assert.strictEqual(adapted.actionType, 'create');
	assert.strictEqual(adapted.actionMeta.label, 'Dibuat');
	assert.strictEqual(adapted.menuMeta.label, 'Produk');
	assert.strictEqual(adapted.user.username, 'superadmin');
	assert.strictEqual(adapted.user.initials, 'OF');
	assert.ok(adapted.timeString.includes('WIB'));
});

test('adaptActionLogs maps arrays safely and filters nulls', () => {
	const list = adaptActionLogs([
		{ id: '1', message: 'Created', menu: 'Product' },
		null,
		{ id: '2', message: 'Deleted', menu: 'Category' }
	]);
	assert.strictEqual(list.length, 2);
	assert.strictEqual(list[0].id, '1');
	assert.strictEqual(list[1].id, '2');
});

test('groupLogsByDate groups logs by date string correctly', () => {
	const logs = [
		adaptActionLog({ id: '1', message: 'A', createdAt: '2026-09-27T10:00:00.000Z' }),
		adaptActionLog({ id: '2', message: 'B', createdAt: '2026-09-27T12:00:00.000Z' }),
		adaptActionLog({ id: '3', message: 'C', createdAt: '2026-09-26T08:00:00.000Z' })
	];

	const groups = groupLogsByDate(logs);
	assert.strictEqual(groups.length, 2);
	assert.strictEqual(groups[0].items.length, 2);
	assert.strictEqual(groups[1].items.length, 1);
});
