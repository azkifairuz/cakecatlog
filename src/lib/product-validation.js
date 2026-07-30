function parsePriceValue(value) {
	const numeric = String(value ?? '').replace(/\D/g, '');
	return numeric ? Number(numeric) : 0;
}

export function getProductFieldErrors({ name, basePrice, variants = [] }) {
	const fieldErrors = {};

	if (!String(name ?? '').trim()) {
		fieldErrors.name = 'Nama produk wajib diisi.';
	}

	if (parsePriceValue(basePrice) <= 0) {
		fieldErrors.base_price = 'Harga dasar wajib diisi dan harus lebih dari Rp0.';
	}

	const variantErrors = {};
	const seenNames = new Set();

	variants.forEach((variant, index) => {
		const variantName = String(variant?.name ?? '').trim();
		const variantPrice = parsePriceValue(variant?.price);
		const hasName = Boolean(variantName);
		const hasPrice = Boolean(String(variant?.price ?? '').replace(/\D/g, ''));

		if (!hasName && !hasPrice) return;

		const rowErrors = {};
		if (!hasName) {
			rowErrors.name = 'Nama size wajib diisi jika harga size diisi.';
		}
		if (!hasPrice || variantPrice <= 0) {
			rowErrors.price = 'Harga size wajib diisi dan harus lebih dari Rp0.';
		}

		if (hasName) {
			const normalizedName = variantName.toLocaleLowerCase('id-ID');
			if (seenNames.has(normalizedName)) {
				rowErrors.name = 'Nama size tidak boleh sama dalam satu produk.';
			} else {
				seenNames.add(normalizedName);
			}
		}

		if (Object.keys(rowErrors).length > 0) {
			variantErrors[index] = rowErrors;
		}
	});

	if (Object.keys(variantErrors).length > 0) {
		fieldErrors.variants = variantErrors;
	}

	return fieldErrors;
}

export function getProductPersistenceErrorMessage(error, stage) {
	if (stage === 'variants' && error?.code === '23505') {
		return 'Nama size tidak boleh sama dalam satu produk.';
	}

	if (stage === 'product' && error?.code === '23503') {
		return 'Kategori yang dipilih sudah tidak tersedia. Pilih kategori lain.';
	}

	const messages = {
		product: 'Detail produk belum berhasil disimpan. Periksa data produk lalu coba lagi.',
		variants: 'Ukuran dan harga produk belum berhasil disimpan. Periksa data size lalu coba lagi.',
		addons: 'Pengaturan addon belum berhasil disimpan. Periksa addon lalu coba lagi.',
		images: 'Gambar produk belum berhasil disimpan. Unggah ulang lalu coba lagi.'
	};

	return messages[stage] ?? 'Produk belum berhasil disimpan. Coba lagi; jika tetap gagal, hubungi pengelola.';
}
