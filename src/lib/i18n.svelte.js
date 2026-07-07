import { browser } from '$app/environment';
import { getContext, setContext } from 'svelte';

const I18N_CONTEXT = Symbol('i18n');
const STORAGE_KEY = 'desertbyfir_locale';

export const defaultLocale = 'id';

export const languageOptions = [
	{ code: 'id', label: 'ID', name: 'Bahasa Indonesia' },
	{ code: 'en', label: 'EN', name: 'English' }
];

export const translations = {
	id: {
		language: {
			switchLabel: 'Ubah bahasa',
			current: 'Bahasa Indonesia'
		},
		nav: {
			about: 'Tentang Kami',
			catalog: 'Katalog',
			features: 'Keunggulan',
			openCart: 'Buka keranjang'
		},
		footer: {
			pickup: 'Pickup',
			address: 'Alamat',
			whatsapp: 'WhatsApp',
			rights: 'Hak cipta dilindungi.'
		},
		hero: {
			eyebrow: 'Artisan Bakery & Cake Shop',
			description:
				'Kami mempersembahkan kue dan pastry premium yang dibuat dengan cinta dan bahan-bahan berkualitas tinggi untuk momen spesial Anda.',
			cta: 'Pesan Kue',
			bannerAlt: 'Banner utama {number}',
			slideLabel: 'Ke slide {number}'
		},
		home: {
			aboutImageAlt: 'Kue dari desertbyfir',
			aboutTitle: 'Tentang Kami',
			aboutParagraph1:
				'desertbyfir adalah toko kue artisan yang berdedikasi untuk menciptakan karya seni yang dapat dinikmati. Kami percaya bahwa setiap perayaan layak mendapatkan kue yang tidak hanya cantik dipandang, tetapi juga luar biasa saat dirasakan.',
			aboutParagraph2:
				'Setiap kue dibuat secara handmade oleh para pastry chef berpengalaman kami, menggunakan resep rahasia yang telah disempurnakan bertahun-tahun. Kepuasan Anda adalah prioritas utama kami.',
			aboutCta: 'Lihat Koleksi Kami',
			featuresTitle: 'Mengapa Memilih Kami?',
			featuresDescription:
				'Kami berkomitmen memberikan pelayanan dan kualitas terbaik untuk setiap pesanan Anda.',
			featureQuality: 'Garansi Kualitas',
			featureDelivery: 'Pengiriman Tepat Waktu',
			featureRecipe: 'Resep Rahasia',
			featureService: 'Pelayanan Ramah',
			catalogTitle: 'Katalog',
			allCategory: 'Semua',
			productDetailLabel: 'Lihat detail {name}',
			noImage: 'Tidak ada gambar',
			startFrom: 'Mulai dari',
			addToCartTitle: 'Tambah ke Keranjang',
			emptyCatalog: 'Belum ada produk di katalog.',
			emptyCategory: 'Belum ada produk di kategori ini.'
		},
		topPicks: {
			eyebrow: 'Pilihan Favorit',
			title: 'Produk Terlaris',
			badge: 'Favorit',
			previous: 'Slide sebelumnya',
			next: 'Slide berikutnya'
		},
		product: {
			backToCatalog: 'Kembali ke Katalog',
			noPhoto: 'Belum ada foto produk',
			descriptionTitle: 'Deskripsi Produk',
			fallbackDescription:
				'Kue lezat ini belum memiliki deskripsi yang mendetail, namun kami jamin rasanya tidak akan mengecewakan.',
			handlingInfo: 'Info Penanganan Khusus',
			addToCart: 'Masukkan ke Keranjang',
			outOfStock: 'Stok Sedang Habis',
			addToCartError: 'Terjadi kesalahan saat menambahkan ke keranjang.'
		},
		form: {
			required: '*',
			size: 'Ukuran',
			quantity: 'Jumlah',
			choose: 'Pilih...',
			flavor: 'Pilihan Rasa',
			chooseFlavor: 'Pilih Rasa...',
			color: 'Pilihan Warna',
			chooseColor: 'Pilih Warna...',
			crown: 'Pilihan Mahkota',
			chooseCrown: 'Pilih Mahkota...',
			glitter: 'Edible Glitter',
			chooseGlitter: 'Pilih Glitter...',
			extraGlitter: 'Glitter Tambahan',
			extraGlitterPlaceholder: 'Contoh: Ya, warna gold',
			cakeTopper: 'Cake Topper',
			cakeTopperFee: 'Kena tambahan biaya {price}',
			giftCard: 'Tulisan Giftcard',
			emptyGiftCard: 'Kosongkan jika tidak ada',
			extraRequestCakeText: 'Request Tambahan / Tulisan Kue',
			extraRequest: 'Request Tambahan',
			extraRequestPlaceholder: 'Topper, lilin, bentuk khusus...',
			designReference: 'Referensi Desain (Opsional)',
			tapToUpload: 'Tap untuk upload',
			noFileSelected: 'Belum ada file dipilih',
			optional: 'Opsional',
			fullName: 'Nama Lengkap',
			fullNamePlaceholder: 'Masukkan nama Anda',
			whatsapp: 'No. WhatsApp',
			whatsappPlaceholder: 'Contoh: 08123456789',
			deliveryDate: 'Tanggal Pengiriman',
			deliveryTime: 'Waktu Pengiriman',
			pickupDate: 'Tanggal Pickup',
			pickupTime: 'Waktu Pickup (Opsional)',
			date: 'Tanggal',
			time: 'Waktu',
			fullAddress: 'Alamat Lengkap',
			address: 'Alamat',
			addressPlaceholder: 'Tuliskan alamat lengkap pengiriman...'
		},
		pricing: {
			estimateTitle: 'Estimasi Harga',
			sizePrice: 'Harga ukuran',
			darkColorSurcharge: 'Tambahan warna gelap',
			cakeTopper: 'Cake topper',
			qty: 'Qty',
			estimatedTotal: 'Estimasi Total',
			finalInvoiceNote:
				'Harga hanya estimasi. Harga final akan dikirim melalui invoice setelah pesanan direview.'
		},
		cart: {
			close: 'Tutup keranjang',
			title: 'Keranjang Belanja',
			emptyTitle: 'Keranjang Anda masih kosong',
			emptyDescription: 'Mari mulai berbelanja kue favorit Anda!',
			removeItem: 'Hapus item',
			flavor: 'Rasa',
			color: 'Warna',
			cakeTopper: 'Cake topper',
			yes: 'Ya',
			text: 'Tulisan',
			size: 'Size',
			darkColor: 'Warna gelap',
			checkout: 'Lanjut Checkout'
		},
		quickAdd: {
			close: 'Tutup modal tambah keranjang',
			title: 'Tambah ke Keranjang',
			cancel: 'Batal',
			save: 'Simpan ke Keranjang'
		},
		checkout: {
			title: 'Checkout | desertbyfir',
			back: 'Kembali Belanja',
			deliveryOptionTitle: 'Pilih Metode Pesanan',
			deliveryOptionDescription: 'Tentukan cara menerima pesanan sebelum mengisi data order.',
			pickup: 'Pickup',
			pickupDescription: 'Ambil sendiri di lokasi desertbyfir.',
			delivery: 'Delivery',
			deliveryDescription: 'Pesanan dikirim ke alamat tujuan.',
			continueToOrder: 'Lanjut Isi Form',
			changeDeliveryOption: 'Ubah metode pesanan',
			method: 'Metode',
			shippingInfo: 'Informasi Pengiriman',
			pickupInfo: 'Informasi Pickup',
			sendOrder: 'Kirim Pesanan',
			orderSummary: 'Ringkasan Pesanan',
			datePastError: 'Tanggal pengiriman tidak boleh di masa lalu!',
			serverError: 'Terjadi kesalahan pada server.',
			color: 'Warna',
			cakeTopper: 'Cake topper',
			successTitle: 'Pesanan Berhasil!',
			successDescription:
				'Terima kasih! Data pesanan Anda telah kami terima dengan baik dan akan segera diproses.',
			backHome: 'Kembali ke Beranda'
		},
		order: {
			title: 'Order {name} | desertbyfir',
			detailTitle: 'Detail Pesanan',
			detailDescription: 'Lengkapi data di bawah untuk memproses pesanan Anda.',
			customerInfo: 'Informasi Pemesan',
			cakeDetail: 'Detail Kue',
			selectedCake: 'Kue Pilihan',
			customization: 'Kustomisasi',
			shipping: 'Pengiriman',
			sendOrder: 'Kirim Pesanan',
			successTitle: 'Pesanan Berhasil!',
			successDescription:
				'Terima kasih! Data pesanan Anda telah kami terima dengan baik dan akan segera diproses.',
			backToCatalog: 'Kembali ke Katalog',
			datePastError: 'Tanggal pengiriman tidak boleh di masa lalu!',
			processError: 'Terjadi kesalahan saat memproses pesanan Anda.'
		},
		server: {
			invalidCart: 'Data keranjang tidak valid',
			emptyCart: 'Keranjang kosong',
			invalidDeliveryOption: 'Metode pesanan tidak valid',
			deliveryAddressRequired: 'Alamat pengiriman wajib diisi',
			deliveryTimeRequired: 'Waktu pengiriman wajib diisi'
		}
	},
	en: {
		language: {
			switchLabel: 'Change language',
			current: 'English'
		},
		nav: {
			about: 'About Us',
			catalog: 'Catalog',
			features: 'Highlights',
			openCart: 'Open cart'
		},
		footer: {
			pickup: 'Pickup',
			address: 'Address',
			whatsapp: 'WhatsApp',
			rights: 'All rights reserved.'
		},
		hero: {
			eyebrow: 'Artisan Bakery & Cake Shop',
			description:
				'We craft premium cakes and pastries with love and high-quality ingredients for your special moments.',
			cta: 'Order Cake',
			bannerAlt: 'Hero banner {number}',
			slideLabel: 'Go to slide {number}'
		},
		home: {
			aboutImageAlt: 'Cake from desertbyfir',
			aboutTitle: 'About Us',
			aboutParagraph1:
				'desertbyfir is an artisan cake shop dedicated to creating edible works of art. We believe every celebration deserves a cake that looks beautiful and tastes exceptional.',
			aboutParagraph2:
				'Every cake is handmade by our experienced pastry chefs using secret recipes refined over the years. Your satisfaction is our top priority.',
			aboutCta: 'View Our Collection',
			featuresTitle: 'Why Choose Us?',
			featuresDescription:
				'We are committed to giving every order the best service and quality.',
			featureQuality: 'Quality Guarantee',
			featureDelivery: 'On-Time Delivery',
			featureRecipe: 'Signature Recipe',
			featureService: 'Friendly Service',
			catalogTitle: 'Catalog',
			allCategory: 'All',
			productDetailLabel: 'View details for {name}',
			noImage: 'No image',
			startFrom: 'Start from',
			addToCartTitle: 'Add to Cart',
			emptyCatalog: 'No products in the catalog yet.',
			emptyCategory: 'No products in this category yet.'
		},
		topPicks: {
			eyebrow: 'Customer Favorites',
			title: 'Best Sellers',
			badge: 'Top Pick',
			previous: 'Previous slide',
			next: 'Next slide'
		},
		product: {
			backToCatalog: 'Back to Catalog',
			noPhoto: 'No product photos yet',
			descriptionTitle: 'Product Description',
			fallbackDescription:
				'This delicious cake does not have a detailed description yet, but we promise the taste will not disappoint.',
			handlingInfo: 'Special Handling Info',
			addToCart: 'Add to Cart',
			outOfStock: 'Currently Out of Stock',
			addToCartError: 'Something went wrong while adding this item to the cart.'
		},
		form: {
			required: '*',
			size: 'Size',
			quantity: 'Quantity',
			choose: 'Choose...',
			flavor: 'Flavor Option',
			chooseFlavor: 'Choose flavor...',
			color: 'Color Option',
			chooseColor: 'Choose color...',
			crown: 'Crown Option',
			chooseCrown: 'Choose crown...',
			glitter: 'Edible Glitter',
			chooseGlitter: 'Choose glitter...',
			extraGlitter: 'Extra Glitter',
			extraGlitterPlaceholder: 'Example: Yes, gold color',
			cakeTopper: 'Cake Topper',
			cakeTopperFee: 'Additional fee {price}',
			giftCard: 'Gift Card Text',
			emptyGiftCard: 'Leave blank if none',
			extraRequestCakeText: 'Extra Request / Cake Text',
			extraRequest: 'Extra Request',
			extraRequestPlaceholder: 'Topper, candles, special shape...',
			designReference: 'Design Reference (Optional)',
			tapToUpload: 'Tap to upload',
			noFileSelected: 'No file selected',
			optional: 'Optional',
			fullName: 'Full Name',
			fullNamePlaceholder: 'Enter your name',
			whatsapp: 'WhatsApp Number',
			whatsappPlaceholder: 'Example: 08123456789',
			deliveryDate: 'Delivery Date',
			deliveryTime: 'Delivery Time',
			pickupDate: 'Pickup Date',
			pickupTime: 'Pickup Time (Optional)',
			date: 'Date',
			time: 'Time',
			fullAddress: 'Full Address',
			address: 'Address',
			addressPlaceholder: 'Write the complete delivery address...'
		},
		pricing: {
			estimateTitle: 'Price Estimate',
			sizePrice: 'Size price',
			darkColorSurcharge: 'Dark color surcharge',
			cakeTopper: 'Cake topper',
			qty: 'Qty',
			estimatedTotal: 'Estimated Total',
			finalInvoiceNote:
				'Prices are estimates only. The final price will be sent by invoice after your order is reviewed.'
		},
		cart: {
			close: 'Close cart',
			title: 'Shopping Cart',
			emptyTitle: 'Your cart is still empty',
			emptyDescription: 'Start shopping for your favorite cakes!',
			removeItem: 'Remove item',
			flavor: 'Flavor',
			color: 'Color',
			cakeTopper: 'Cake topper',
			yes: 'Yes',
			text: 'Text',
			size: 'Size',
			darkColor: 'Dark color',
			checkout: 'Continue Checkout'
		},
		quickAdd: {
			close: 'Close add-to-cart modal',
			title: 'Add to Cart',
			cancel: 'Cancel',
			save: 'Save to Cart'
		},
		checkout: {
			title: 'Checkout | desertbyfir',
			back: 'Continue Shopping',
			deliveryOptionTitle: 'Choose Order Method',
			deliveryOptionDescription: 'Choose how you want to receive your order before filling in the order form.',
			pickup: 'Pickup',
			pickupDescription: 'Pick up your order at desertbyfir.',
			delivery: 'Delivery',
			deliveryDescription: 'Have your order sent to a destination address.',
			continueToOrder: 'Continue to Form',
			changeDeliveryOption: 'Change order method',
			method: 'Method',
			shippingInfo: 'Delivery Information',
			pickupInfo: 'Pickup Information',
			sendOrder: 'Send Order',
			orderSummary: 'Order Summary',
			datePastError: 'Delivery date cannot be in the past!',
			serverError: 'A server error occurred.',
			color: 'Color',
			cakeTopper: 'Cake topper',
			successTitle: 'Order Successful!',
			successDescription:
				'Thank you! We have received your order details and will process them shortly.',
			backHome: 'Back to Home'
		},
		order: {
			title: 'Order {name} | desertbyfir',
			detailTitle: 'Order Details',
			detailDescription: 'Complete the details below so we can process your order.',
			customerInfo: 'Customer Information',
			cakeDetail: 'Cake Details',
			selectedCake: 'Selected Cake',
			customization: 'Customization',
			shipping: 'Delivery',
			sendOrder: 'Send Order',
			successTitle: 'Order Successful!',
			successDescription:
				'Thank you! We have received your order details and will process them shortly.',
			backToCatalog: 'Back to Catalog',
			datePastError: 'Delivery date cannot be in the past!',
			processError: 'Something went wrong while processing your order.'
		},
		server: {
			invalidCart: 'Cart data is invalid',
			emptyCart: 'Cart is empty',
			invalidDeliveryOption: 'Order method is invalid',
			deliveryAddressRequired: 'Delivery address is required',
			deliveryTimeRequired: 'Delivery time is required'
		}
	}
};

export function normalizeLocale(value) {
	const locale = String(value || '').toLowerCase();
	if (locale.startsWith('en')) return 'en';
	if (locale.startsWith('id') || locale.startsWith('in')) return 'id';
	return defaultLocale;
}

export function detectDeviceLocale() {
	if (!browser) return defaultLocale;

	const candidates = navigator.languages?.length ? navigator.languages : [navigator.language];
	const match = candidates.find((locale) => normalizeLocale(locale) !== defaultLocale || locale?.toLowerCase().startsWith('id'));

	return normalizeLocale(match || candidates[0]);
}

function getNestedValue(source, key) {
	return key.split('.').reduce((value, segment) => value?.[segment], source);
}

export function translate(locale, key, params = {}) {
	const normalizedLocale = normalizeLocale(locale);
	const text =
		getNestedValue(translations[normalizedLocale], key) ??
		getNestedValue(translations[defaultLocale], key) ??
		key;

	return Object.entries(params).reduce(
		(result, [param, value]) => result.replaceAll(`{${param}}`, String(value)),
		text
	);
}

class I18nState {
	locale = $state(defaultLocale);

	constructor(initialLocale) {
		this.locale = normalizeLocale(initialLocale);
	}

	init(serverLocale) {
		if (browser) {
			const savedLocale = localStorage.getItem(STORAGE_KEY);
			this.locale = savedLocale ? normalizeLocale(savedLocale) : detectDeviceLocale();
		} else {
			this.locale = normalizeLocale(serverLocale);
		}

		this.syncDocumentLanguage();
	}

	setLocale(nextLocale) {
		this.locale = normalizeLocale(nextLocale);

		if (browser) {
			localStorage.setItem(STORAGE_KEY, this.locale);
		}

		this.syncDocumentLanguage();
	}

	t(key, params = {}) {
		return translate(this.locale, key, params);
	}

	syncDocumentLanguage() {
		if (browser) {
			document.documentElement.lang = this.locale;
		}
	}
}

export function createI18n(initialLocale) {
	return new I18nState(initialLocale);
}

export function setI18n(i18n) {
	setContext(I18N_CONTEXT, i18n);
	return i18n;
}

export function getI18n() {
	return getContext(I18N_CONTEXT);
}
