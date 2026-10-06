import assert from 'node:assert/strict';
import test from 'node:test';
import {
	groupPermissionsByCategory,
	validateEmployeeInput,
	validateRoleInput,
	getRoleBadgeMeta
} from '../src/lib/employee-role-utils.js';

test('validateEmployeeInput correctly validates required fields, email format, and lengths', () => {
	// Valid creation input
	const validCreate = validateEmployeeInput({
		email: 'staff@dessertbyfir.com',
		username: 'staff_order',
		password: 'password123',
		isEdit: false
	});
	assert.equal(validCreate.isValid, true);

	// Missing email
	const missingEmail = validateEmployeeInput({
		email: '',
		username: 'staff_order',
		password: 'password123'
	});
	assert.equal(missingEmail.isValid, false);
	assert.match(missingEmail.error, /Email wajib diisi/);

	// Invalid email format
	const invalidEmail = validateEmployeeInput({
		email: 'not-an-email',
		username: 'staff_order',
		password: 'password123'
	});
	assert.equal(invalidEmail.isValid, false);
	assert.match(invalidEmail.error, /Format email tidak valid/);

	// Short username
	const shortUsername = validateEmployeeInput({
		email: 'staff@dessertbyfir.com',
		username: 'ab',
		password: 'password123'
	});
	assert.equal(shortUsername.isValid, false);
	assert.match(shortUsername.error, /Username minimal 3 karakter/);

	// Short password on create
	const shortPassword = validateEmployeeInput({
		email: 'staff@dessertbyfir.com',
		username: 'staff_order',
		password: '123',
		isEdit: false
	});
	assert.equal(shortPassword.isValid, false);
	assert.match(shortPassword.error, /Password minimal 8 karakter/);

	// Valid edit without password change
	const validEdit = validateEmployeeInput({
		email: 'staff@dessertbyfir.com',
		username: 'staff_order',
		isEdit: true
	});
	assert.equal(validEdit.isValid, true);
});

test('validateRoleInput validates role names correctly', () => {
	assert.equal(validateRoleInput({ name: 'cashier' }).isValid, true);
	assert.equal(validateRoleInput({ name: 'k' }).isValid, false);
	assert.equal(validateRoleInput({ name: '' }).isValid, false);
});

test('groupPermissionsByCategory categorizes permissions by key prefix and sorts by logical order', () => {
	const rawPermissions = [
		{ id: '1', key: 'order.read', name: 'Read Orders' },
		{ id: '2', key: 'order.write', name: 'Write Orders' },
		{ id: '3', key: 'product.read', name: 'Read Products' },
		{ id: '4', key: 'role.manage', name: 'Manage Roles' },
		{ id: '5', key: 'custom.feature', name: 'Custom Feature' }
	];

	const grouped = groupPermissionsByCategory(rawPermissions);
	assert.ok(Array.isArray(grouped));
	assert.ok(grouped.length >= 4);

	const orderGroup = grouped.find((g) => g.categoryKey === 'order');
	assert.ok(orderGroup);
	assert.equal(orderGroup.permissions.length, 2);
	assert.equal(orderGroup.permissions[0].key, 'order.read');

	const productGroup = grouped.find((g) => g.categoryKey === 'product');
	assert.ok(productGroup);
	assert.equal(productGroup.permissions.length, 1);

	const otherGroup = grouped.find((g) => g.categoryKey === 'other');
	assert.ok(otherGroup);
	assert.equal(otherGroup.permissions[0].key, 'custom.feature');
});

test('groupPermissionsByCategory handles empty or invalid lists safely', () => {
	assert.deepEqual(groupPermissionsByCategory(null), []);
	assert.deepEqual(groupPermissionsByCategory(undefined), []);
	assert.deepEqual(groupPermissionsByCategory([]), []);
});

test('getRoleBadgeMeta identifies super_admin and assigns proper badges', () => {
	const superAdmin = getRoleBadgeMeta('super_admin');
	assert.equal(superAdmin.isSuperAdmin, true);
	assert.equal(superAdmin.label, 'Super Admin');
	assert.match(superAdmin.badgeClass, /purple/);

	const admin = getRoleBadgeMeta('admin');
	assert.equal(admin.isSuperAdmin, false);
	assert.equal(admin.label, 'Admin');
	assert.match(admin.badgeClass, /blue/);

	const cashier = getRoleBadgeMeta('cashier');
	assert.equal(cashier.isSuperAdmin, false);
	assert.equal(cashier.label, 'Kasir');
	assert.match(cashier.badgeClass, /emerald/);

	const kitchen = getRoleBadgeMeta('kitchen');
	assert.equal(kitchen.isSuperAdmin, false);
	assert.equal(kitchen.label, 'Dapur');
	assert.match(kitchen.badgeClass, /amber/);

	const customRole = getRoleBadgeMeta('manager');
	assert.equal(customRole.isSuperAdmin, false);
	assert.equal(customRole.label, 'manager');
});
