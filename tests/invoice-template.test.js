import test from 'node:test';
import assert from 'node:assert/strict';
import {
	DEFAULT_INVOICE_TEMPLATE,
	SAMPLE_ORDERS,
	normalizeInvoiceTemplate,
	normalizeTemplateVariables,
	renderProductItems,
	renderInvoicePreview,
	formatWhatsAppToHtml
} from '../src/lib/invoice-template.js';

test('normalizeInvoiceTemplate provides standard default values when empty or invalid', () => {
	const empty = normalizeInvoiceTemplate(null);
	assert.strictEqual(empty.id, 'main');
	assert.strictEqual(empty.messageTemplate, DEFAULT_INVOICE_TEMPLATE.messageTemplate);
	assert.strictEqual(empty.itemTemplate, DEFAULT_INVOICE_TEMPLATE.itemTemplate);
	assert.strictEqual(empty.emailSubjectTemplate, DEFAULT_INVOICE_TEMPLATE.emailSubjectTemplate);

	const custom = normalizeInvoiceTemplate({
		messageTemplate: '*Halo kak*',
		itemTemplate: '- {{product.name}}',
		emailSubjectTemplate: 'Invoice Pesanan'
	});
	assert.strictEqual(custom.messageTemplate, '*Halo kak*');
	assert.strictEqual(custom.itemTemplate, '- {{product.name}}');
	assert.strictEqual(custom.emailSubjectTemplate, 'Invoice Pesanan');
});

test('renderProductItems renders multiple products using itemTemplate placeholders', () => {
	const template = '{{product.index}}. {{product.name}} (x{{product.quantity}}) - Rp {{product.subtotal}}';
	const items = [
		{ index: 1, name: 'Choco Cake', quantity: 2, subtotal: '100.000' },
		{ index: 2, name: 'Brownies', quantity: 1, subtotal: '45.000' }
	];

	const rendered = renderProductItems(template, items);
	assert.strictEqual(
		rendered,
		'1. Choco Cake (x2) - Rp 100.000\n\n2. Brownies (x1) - Rp 45.000'
	);
});

test('renderInvoicePreview replaces all variables in message, email, and products', () => {
	const templates = {
		emailSubjectTemplate: 'Invoice #{{order.number}} untuk {{customer.name}}',
		itemTemplate: '• {{product.name}} (Rp {{product.price}})',
		messageTemplate: 'Pesanan {{order.number}}\nNama: {{customer.name}}\nProduk:\n{{products}}\nTotal: Rp {{payment.total}}\nAlamat: {{delivery.address}}'
	};

	const preview = renderInvoicePreview(templates, SAMPLE_ORDERS.single);

	assert.strictEqual(preview.emailSubject, 'Invoice #ORD-2026-088 untuk Dewi Lestari');
	assert.ok(preview.products.includes('• Black Forest Signature Cake (Rp 185.000)'));
	assert.ok(preview.message.includes('Pesanan ORD-2026-088'));
	assert.ok(preview.message.includes('Nama: Dewi Lestari'));
	assert.ok(preview.message.includes('Total: Rp 200.000'));
	assert.ok(preview.message.includes('Alamat: Jl. Melati No. 42'));
});

test('normalizeTemplateVariables merges backend variables seamlessly', () => {
	const backendVars = [
		{ key: 'order.number', description: 'Nomor nota pesanan baru' },
		{ key: 'custom.coupon', description: 'Kode kupon promo' }
	];

	const merged = normalizeTemplateVariables(backendVars);
	const orderNumberVar = merged.find((v) => v.key === 'order.number');
	assert.ok(orderNumberVar);
	assert.strictEqual(orderNumberVar.description, 'Nomor nota pesanan baru');

	const customCouponVar = merged.find((v) => v.key === 'custom.coupon');
	assert.ok(customCouponVar);
	assert.strictEqual(customCouponVar.category, 'order');
});

test('formatWhatsAppToHtml accurately parses markdown to HTML without XSS', () => {
	const raw = '*Tebal* & _Miring_ ~Coret~\n`Kode`\n<script>alert(1)</script>';
	const html = formatWhatsAppToHtml(raw);

	assert.ok(html.includes('<strong class="font-bold text-foreground">Tebal</strong>'));
	assert.ok(html.includes('<em class="italic">Miring</em>'));
	assert.ok(html.includes('<del class="line-through opacity-70">Coret</del>'));
	assert.ok(html.includes('<code class="bg-black/10 rounded px-1 text-[13px] font-mono">Kode</code>'));
	assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
	assert.ok(html.includes('<br />'));
});
