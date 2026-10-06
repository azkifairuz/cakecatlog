import assert from 'node:assert/strict';
import test from 'node:test';
import {
	adaptExpense,
	adaptExpenses,
	adaptExpenseCategory,
	adaptExpenseCategories
} from '../src/lib/api/adapters.js';

test('adaptExpenseCategory maps backend response fields correctly', () => {
	const rawCategory = {
		id: 'cat-uuid-1',
		name: 'Bahan Baku',
		createdAt: '2026-09-29T00:00:00.000Z',
		updatedAt: '2026-09-29T00:00:00.000Z'
	};

	const adapted = adaptExpenseCategory(rawCategory);
	assert.equal(adapted.id, 'cat-uuid-1');
	assert.equal(adapted.name, 'Bahan Baku');
	assert.equal(adapted.createdAt, '2026-09-29T00:00:00.000Z');
	assert.equal(adapted.created_at, '2026-09-29T00:00:00.000Z');
	assert.equal(adapted.updatedAt, '2026-09-29T00:00:00.000Z');
	assert.equal(adapted.updated_at, '2026-09-29T00:00:00.000Z');

	assert.equal(adaptExpenseCategory(null), null);
	assert.equal(adaptExpenseCategory(undefined), undefined);
});

test('adaptExpenseCategories maps arrays safely and filters nulls', () => {
	const rawList = [
		{ id: '1', name: 'Bahan Baku' },
		{ id: '2', name: 'Kemasan & Box' }
	];

	const adapted = adaptExpenseCategories(rawList);
	assert.equal(adapted.length, 2);
	assert.equal(adapted[0].name, 'Bahan Baku');
	assert.equal(adapted[1].name, 'Kemasan & Box');

	assert.deepEqual(adaptExpenseCategories(null), []);
	assert.deepEqual(adaptExpenseCategories(undefined), []);
	assert.deepEqual(adaptExpenseCategories('invalid'), []);
});

test('adaptExpense normalizes camelCase, snake_case, and numeric amount fields', () => {
	const rawExpense = {
		id: 'exp-uuid-1',
		name: 'Beli Tepung Terigu 10kg',
		categoryId: 'cat-uuid-1',
		categoryName: 'Bahan Baku',
		amount: '250000',
		createdAt: '2026-09-29T08:30:00.000Z',
		updatedAt: '2026-09-29T08:30:00.000Z'
	};

	const adapted = adaptExpense(rawExpense);
	assert.equal(adapted.id, 'exp-uuid-1');
	assert.equal(adapted.name, 'Beli Tepung Terigu 10kg');
	assert.equal(adapted.categoryId, 'cat-uuid-1');
	assert.equal(adapted.category_id, 'cat-uuid-1');
	assert.equal(adapted.categoryName, 'Bahan Baku');
	assert.equal(adapted.category_name, 'Bahan Baku');
	assert.equal(adapted.amount, 250000);
	assert.equal(typeof adapted.amount, 'number');
	assert.equal(adapted.createdAt, '2026-09-29T08:30:00.000Z');
	assert.equal(adapted.created_at, '2026-09-29T08:30:00.000Z');

	assert.equal(adaptExpense(null), null);
	assert.equal(adaptExpense(undefined), undefined);
});

test('adaptExpenses maps arrays and handles missing fields safely', () => {
	const rawList = [
		{
			id: 'exp-1',
			name: 'Beli Margarin',
			category_id: 'cat-1',
			category_name: 'Bahan Baku',
			amount: 150000
		},
		{
			id: 'exp-2',
			name: 'Beli Box Cake 20x20',
			category_id: 'cat-2',
			category_name: 'Kemasan',
			amount: 85000
		}
	];

	const adapted = adaptExpenses(rawList);
	assert.equal(adapted.length, 2);
	assert.equal(adapted[0].amount, 150000);
	assert.equal(adapted[0].categoryId, 'cat-1');
	assert.equal(adapted[1].amount, 85000);
	assert.equal(adapted[1].categoryName, 'Kemasan');

	assert.deepEqual(adaptExpenses(null), []);
	assert.deepEqual(adaptExpenses(undefined), []);
});

test('expense filtering by query, category, and calculation of totals works accurately', () => {
	const expenses = [
		{ id: '1', name: 'Beli Coklat Batang', categoryId: 'cat-1', categoryName: 'Bahan Baku', amount: 200000 },
		{ id: '2', name: 'Beli Tepung', categoryId: 'cat-1', categoryName: 'Bahan Baku', amount: 100000 },
		{ id: '3', name: 'Beli Pita Satin', categoryId: 'cat-2', categoryName: 'Dekorasi', amount: 50000 },
		{ id: '4', name: 'Listrik & Gas Dapur', categoryId: 'cat-3', categoryName: 'Operasional', amount: 350000 }
	];

	// Total all amount
	const totalAll = expenses.reduce((sum, e) => sum + e.amount, 0);
	assert.equal(totalAll, 700000);

	// Filter by Category = 'cat-1'
	const bahanBakuExpenses = expenses.filter((e) => e.categoryId === 'cat-1');
	assert.equal(bahanBakuExpenses.length, 2);
	const totalBahanBaku = bahanBakuExpenses.reduce((sum, e) => sum + e.amount, 0);
	assert.equal(totalBahanBaku, 300000);

	// Search query = 'pita'
	const searchPita = expenses.filter((e) => e.name.toLowerCase().includes('pita'));
	assert.equal(searchPita.length, 1);
	assert.equal(searchPita[0].id, '3');

	// Category with highest total
	const categoryTotals = {};
	for (const e of expenses) {
		categoryTotals[e.categoryName] = (categoryTotals[e.categoryName] || 0) + e.amount;
	}
	assert.equal(categoryTotals['Operasional'], 350000);
	assert.equal(categoryTotals['Bahan Baku'], 300000);
	assert.equal(categoryTotals['Dekorasi'], 50000);
});
