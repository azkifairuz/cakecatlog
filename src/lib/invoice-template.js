/**
 * Utilitas dan engine rendering untuk template invoice WhatsApp & Email
 */

export const DEFAULT_INVOICE_TEMPLATE = {
	id: 'main',
	emailSubjectTemplate: 'Invoice Pesanan #{{order.number}} - dessertbyfir',
	itemTemplate: '{{product.index}}. *{{product.name}}* (x{{product.quantity}})\n   {{product.variant}} {{product.size}}\n   Harga: Rp {{product.price}} | Subtotal: Rp {{product.subtotal}}',
	messageTemplate: `*INVOICE PESANAN #{{order.number}}*
Halo kak {{customer.name}}, terima kasih telah memesan di dessertbyfir! ✨

*Detail Pesanan:*
{{products}}

*Pengiriman:*
📍 Alamat: {{delivery.address}}
📅 Jadwal: {{delivery.date}} ({{delivery.time}})

*Ringkasan Pembayaran:*
• Subtotal: Rp {{payment.subtotal}}
• Ongkos Kirim: Rp {{payment.deliveryFee}}
• *Total Pembayaran: Rp {{payment.total}}*

*Metode Pembayaran:*
{{payment.accounts}}

Konfirmasi pembayaran dapat dikirimkan dengan membalas pesan ini ya kak. Terima kasih! 🙏`
};

export const VARIABLE_CATEGORIES = [
	{
		id: 'all',
		label: 'Semua Variabel',
		icon: 'Sparkles'
	},
	{
		id: 'order',
		label: 'Pesanan & Pelanggan',
		icon: 'ShoppingBag'
	},
	{
		id: 'payment',
		label: 'Pembayaran',
		icon: 'CreditCard'
	},
	{
		id: 'product',
		label: 'Item Produk (itemTemplate)',
		icon: 'Cake'
	},
	{
		id: 'store',
		label: 'Info Toko',
		icon: 'Store'
	}
];

export const DEFAULT_TEMPLATE_VARIABLES = [
	// Order & Customer
	{ key: 'order.number', label: 'Nomor Pesanan', category: 'order', description: 'Nomor nota / invoice (contoh: ORD-2026-001)', sample: 'ORD-2026-001' },
	{ key: 'order.status', label: 'Status Pesanan', category: 'order', description: 'Status pesanan saat ini (contoh: Menunggu Pembayaran)', sample: 'Menunggu Pembayaran' },
	{ key: 'customer.name', label: 'Nama Pelanggan', category: 'order', description: 'Nama pemesan', sample: 'Dewi Lestari' },
	{ key: 'customer.phone', label: 'No. HP / WA', category: 'order', description: 'Nomor WhatsApp pemesan', sample: '081234567890' },
	{ key: 'delivery.date', label: 'Tanggal Kirim/Ambil', category: 'order', description: 'Tanggal pengiriman atau pickup', sample: '28 September 2026' },
	{ key: 'delivery.time', label: 'Waktu / Jam', category: 'order', description: 'Jam pengiriman atau jam operasional pickup', sample: '13:00 - 15:00 WIB' },
	{ key: 'delivery.address', label: 'Alamat Pengiriman', category: 'order', description: 'Alamat lengkap pengiriman atau info pickup di toko', sample: 'Jl. Melati No. 42, Kebayoran Baru, Jakarta Selatan' },

	// Payment
	{ key: 'payment.subtotal', label: 'Subtotal Produk', category: 'payment', description: 'Total harga produk sebelum ongkir', sample: '185.000' },
	{ key: 'payment.deliveryFee', label: 'Ongkos Kirim', category: 'payment', description: 'Biaya kirim kurir / ekspedisi', sample: '15.000' },
	{ key: 'payment.total', label: 'Total Pembayaran', category: 'payment', description: 'Grand total yang harus dibayar pelanggan', sample: '200.000' },
	{ key: 'payment.accounts', label: 'Daftar Semua Rekening', category: 'payment', description: 'Daftar bank dan nomor rekening toko', sample: '• BCA: 1234567890 a/n dessertbyfir\n• Mandiri: 9876543210 a/n dessertbyfir' },
	{ key: 'payment.account.name', label: 'Nama Bank / Rekening', category: 'payment', description: 'Nama bank atau pemilik rekening', sample: 'BCA a/n dessertbyfir' },
	{ key: 'payment.account.norek', label: 'Nomor Rekening', category: 'payment', description: 'Nomor rekening pertama', sample: '1234567890' },

	// Products (Only for itemTemplate or {{products}} wrapper)
	{ key: 'products', label: 'Daftar Seluruh Produk', category: 'product', description: 'Placeholder utama di messageTemplate untuk merender semua produk', sample: '1. Black Forest Cake (x1)\n   Medium (18cm)\n   Harga: Rp 150.000 | Subtotal: Rp 150.000\n\n2. Fudgy Brownie Bites (x1)\n   Original\n   Harga: Rp 35.000 | Subtotal: Rp 35.000' },
	{ key: 'product.index', label: 'Nomor Urut Item', category: 'product', isItemOnly: true, description: 'Nomor urut (1, 2, 3...) dalam itemTemplate', sample: '1' },
	{ key: 'product.name', label: 'Nama Produk', category: 'product', isItemOnly: true, description: 'Nama kue atau produk pesanan', sample: 'Black Forest Signature' },
	{ key: 'product.quantity', label: 'Jumlah (Qty)', category: 'product', isItemOnly: true, description: 'Jumlah kuantiti dipesan', sample: '1' },
	{ key: 'product.price', label: 'Harga Satuan', category: 'product', isItemOnly: true, description: 'Harga satuan produk per item', sample: '150.000' },
	{ key: 'product.subtotal', label: 'Subtotal Item', category: 'product', isItemOnly: true, description: 'Total per item (qty × harga)', sample: '150.000' },
	{ key: 'product.variant', label: 'Varian Produk', category: 'product', isItemOnly: true, description: 'Varian / tipe kue', sample: 'Signature Dark Chocolate' },
	{ key: 'product.size', label: 'Ukuran Kue', category: 'product', isItemOnly: true, description: 'Ukuran kue (contoh: Diameter 18cm)', sample: 'Diameter 18cm' },
	{ key: 'product.flavor', label: 'Rasa', category: 'product', isItemOnly: true, description: 'Pilihan rasa', sample: 'Belgian Chocolate' },
	{ key: 'product.color', label: 'Warna / Tema', category: 'product', isItemOnly: true, description: 'Tema warna dekorasi kue', sample: 'Pastel Brown' },

	// Store
	{ key: 'store.address', label: 'Alamat Toko', category: 'store', description: 'Alamat lengkap toko / kitchen', sample: 'Jl. Kemang Raya No. 10, Jakarta Selatan' },
	{ key: 'store.whatsapp', label: 'WhatsApp Toko', category: 'store', description: 'Nomor WhatsApp admin toko', sample: '081298765432' },
	{ key: 'store.hours', label: 'Jam Operasional', category: 'store', description: 'Waktu buka & pickup toko', sample: 'Senin - Minggu (09:00 - 18:00 WIB)' }
];

export const SAMPLE_ORDERS = {
	single: {
		order: { number: 'ORD-2026-088', status: 'Menunggu Pembayaran' },
		customer: { name: 'Dewi Lestari', phone: '081234567890' },
		delivery: {
			date: '28 September 2026',
			time: '13:00 - 15:00 WIB',
			address: 'Jl. Melati No. 42, Kebayoran Baru, Jakarta Selatan'
		},
		payment: {
			subtotal: '185.000',
			deliveryFee: '15.000',
			total: '200.000',
			accounts: '• BCA: 1234567890 a/n dessertbyfir\n• Mandiri: 9876543210 a/n dessertbyfir',
			account: { name: 'BCA a/n dessertbyfir', norek: '1234567890' }
		},
		store: {
			address: 'Jl. Kemang Raya No. 10, Jakarta Selatan',
			whatsapp: '081298765432',
			hours: '09:00 - 18:00 WIB'
		},
		items: [
			{
				index: 1,
				name: 'Black Forest Signature Cake',
				quantity: 1,
				price: '185.000',
				subtotal: '185.000',
				variant: 'Classic Dark Choco',
				size: 'Diameter 18cm',
				flavor: 'Belgian Chocolate',
				color: 'Deep Brown & Cherry'
			}
		]
	},
	multi: {
		order: { number: 'ORD-2026-092', status: 'Menunggu Pembayaran' },
		customer: { name: 'Rian Pratama', phone: '085712345678' },
		delivery: {
			date: '29 September 2026',
			time: '10:00 - 12:00 WIB',
			address: 'Apartemen Menteng Park Tower Emerald Lt. 12, Jakarta Pusat'
		},
		payment: {
			subtotal: '310.000',
			deliveryFee: '20.000',
			total: '330.000',
			accounts: '• BCA: 1234567890 a/n dessertbyfir\n• Mandiri: 9876543210 a/n dessertbyfir',
			account: { name: 'BCA a/n dessertbyfir', norek: '1234567890' }
		},
		store: {
			address: 'Jl. Kemang Raya No. 10, Jakarta Selatan',
			whatsapp: '081298765432',
			hours: '09:00 - 18:00 WIB'
		},
		items: [
			{
				index: 1,
				name: 'Lotus Biscoff Cheesecake',
				quantity: 1,
				price: '220.000',
				subtotal: '220.000',
				variant: 'Creamy Baked',
				size: 'Diameter 20cm',
				flavor: 'Caramel Biscoff',
				color: 'Warm Caramel'
			},
			{
				index: 2,
				name: 'Fudgy Brownie Bites Box',
				quantity: 2,
				price: '45.000',
				subtotal: '90.000',
				variant: 'Mixed Toppings (Almond & Cheese)',
				size: 'Box isi 16 pcs',
				flavor: 'Double Dark Chocolate',
				color: 'Dark Chocolate'
			}
		]
	}
};

/**
 * Normalizes template object received from API or form
 */
export function normalizeInvoiceTemplate(raw) {
	if (!raw || typeof raw !== 'object') {
		return { ...DEFAULT_INVOICE_TEMPLATE };
	}

	return {
		id: raw.id || 'main',
		messageTemplate: typeof raw.messageTemplate === 'string' ? raw.messageTemplate : DEFAULT_INVOICE_TEMPLATE.messageTemplate,
		itemTemplate: typeof raw.itemTemplate === 'string' ? raw.itemTemplate : DEFAULT_INVOICE_TEMPLATE.itemTemplate,
		emailSubjectTemplate: typeof raw.emailSubjectTemplate === 'string' ? raw.emailSubjectTemplate : DEFAULT_INVOICE_TEMPLATE.emailSubjectTemplate
	};
}

/**
 * Normalizes variable definitions list, merging backend variables with standard list
 */
export function normalizeTemplateVariables(backendVariables = []) {
	const map = new Map();

	// Load defaults first
	for (const v of DEFAULT_TEMPLATE_VARIABLES) {
		map.set(v.key, { ...v });
	}

	// Merge backend variables if provided
	if (Array.isArray(backendVariables)) {
		for (const bv of backendVariables) {
			if (!bv || !bv.key) continue;
			const existing = map.get(bv.key);
			if (existing) {
				map.set(bv.key, {
					...existing,
					description: bv.description || existing.description,
					label: bv.label || existing.label
				});
			} else {
				const category = bv.key.startsWith('product.')
					? 'product'
					: bv.key.startsWith('payment.')
						? 'payment'
						: bv.key.startsWith('store.')
							? 'store'
							: 'order';
				map.set(bv.key, {
					key: bv.key,
					label: bv.key,
					category,
					isItemOnly: bv.key.startsWith('product.') && bv.key !== 'products',
					description: bv.description || `Variabel ${bv.key}`,
					sample: `[${bv.key}]`
				});
			}
		}
	}

	return Array.from(map.values());
}

/**
 * Replaces nested keys in text like {{order.number}} or {{customer.name}}
 */
function replacePlaceholders(text, data = {}) {
	if (!text) return '';
	return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
		const keys = key.split('.');
		let current = data;
		for (const k of keys) {
			if (current === undefined || current === null) return match;
			current = current[k];
		}
		return current !== undefined && current !== null ? String(current) : match;
	});
}

/**
 * Render product items using itemTemplate
 */
export function renderProductItems(itemTemplate, items = []) {
	if (!itemTemplate || !Array.isArray(items) || items.length === 0) {
		return '';
	}

	return items
		.map((item, idx) => {
			const productData = {
				product: {
					index: item.index ?? idx + 1,
					name: item.name ?? '',
					quantity: item.quantity ?? 1,
					price: item.price ?? '',
					subtotal: item.subtotal ?? '',
					variant: item.variant ?? '',
					size: item.size ?? '',
					flavor: item.flavor ?? '',
					color: item.color ?? ''
				}
			};
			return replacePlaceholders(itemTemplate, productData);
		})
		.join('\n\n');
}

/**
 * Renders complete preview of invoice WhatsApp message & Email subject
 */
export function renderInvoicePreview(templates, sampleData = SAMPLE_ORDERS.single) {
	const safeTemplates = normalizeInvoiceTemplate(templates);
	const renderedProducts = renderProductItems(safeTemplates.itemTemplate, sampleData.items || []);

	const contextData = {
		...sampleData,
		products: renderedProducts
	};

	const renderedMessage = replacePlaceholders(safeTemplates.messageTemplate, contextData);
	const renderedEmailSubject = replacePlaceholders(safeTemplates.emailSubjectTemplate, contextData);

	return {
		message: renderedMessage,
		emailSubject: renderedEmailSubject,
		products: renderedProducts
	};
}

/**
 * Converts WhatsApp markdown formatting (*bold*, _italic_, ~strike~, ```code```, newlines)
 * into safe HTML for realistic previewing.
 */
export function formatWhatsAppToHtml(text) {
	if (!text) return '';

	// Escape standard HTML characters first
	let escaped = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

	// Code blocks ```code```
	escaped = escaped.replace(/```([\s\S]*?)```/g, '<code class="bg-black/10 rounded px-1 py-0.5 font-mono text-[13px]">$1</code>');

	// Bold *text*
	escaped = escaped.replace(/\*([^*\n]+)\*/g, '<strong class="font-bold text-foreground">$1</strong>');

	// Italic _text_
	escaped = escaped.replace(/_([^_\n]+)_/g, '<em class="italic">$1</em>');

	// Strikethrough ~text~
	escaped = escaped.replace(/~([^~\n]+)~/g, '<del class="line-through opacity-70">$1</del>');

	// Monospace `text`
	escaped = escaped.replace(/`([^`\n]+)`/g, '<code class="bg-black/10 rounded px-1 text-[13px] font-mono">$1</code>');

	// Newlines to <br />
	escaped = escaped.replace(/\n/g, '<br />');

	return escaped;
}
