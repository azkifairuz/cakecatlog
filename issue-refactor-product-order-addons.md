# Issue: Refactor Product dan Order Addons

## Latar Belakang

Saat ini pilihan addons product seperti `size`, `color`, `flavor`, `crown`, `is_dark_color`, dan `cake_topper` masih disimpan sebagai input field langsung di bagian admin/product. Struktur ini perlu direfactor supaya addons dikelola dari konfigurasi global, bisa dipakai ulang, dan bisa dioverride per product jika ada product yang membutuhkan pilihan addons khusus.

## Tujuan

- Menghapus field addons statis dari form/product admin.
- Menambahkan menu konfigurasi global addons.
- Menampilkan addons ke user dari table addons, bukan dari field product.
- Menambahkan dukungan addons per product.
- Mengubah penyimpanan customized order menjadi format `JSONB`.

## Scope Perubahan

### 1. Refactor Addons di Admin Product

Hapus field-field addons berikut dari input product admin:

- `size`
- `color`
- `flavor`
- `crown`
- `is_dark_color`
- `cake_topper`

Field-field tersebut tidak lagi menjadi bagian langsung dari form product.

### 2. Menu Konfigurasi Global Addons

Buat menu baru untuk konfigurasi global addons.

Menu ini digunakan untuk membuat, mengubah, mengaktifkan, dan menonaktifkan data addons global. Tampilan data harus dipisahkan berdasarkan `category` atau digroup by category.

Contoh category:

- `size`
- `color`
- `flavor`
- `crown`
- `glitter`
- `cake_topper`

Struktur table:

```sql
CREATE TABLE global_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    additional_price NUMERIC DEFAULT 0 NOT NULL,
    is_dark_color BOOLEAN DEFAULT false,
    dark_color_surcharge NUMERIC DEFAULT 0;
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Contoh isi data:

- `category`: `size`, `name`: `8cm`, `additional_price`: `10000`
- `category`: `flavor`, `name`: `Coklat`, `additional_price`: `0`
- `category`: `crown`, `name`: `Gold Crown`, `additional_price`: `10000`
- `category`: `glitter`, `name`: `Test1`, `additional_price`: `0`


### 3. Tampilan Addons di Sisi User

Bagian user tetap menampilkan pilihan addons seperti sebelumnya.

Perubahan utama:

- Data pilihan addons diambil dari table `global_addons`.
- Hanya tampilkan addons dengan `is_active = true`.
- Jika product memiliki konfigurasi addons khusus di `product_addons`, tampilkan addons sesuai relasi product tersebut.
- Jika product tidak memiliki konfigurasi khusus, gunakan global addons aktif sebagai default.

### 4. Addons Per Product

Tambahkan fitur untuk menentukan addons khusus per product.

Fitur ini digunakan jika ada product tertentu yang pilihan addons-nya berbeda dari konfigurasi global.

Struktur table:

```sql
CREATE TABLE product_addons (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES global_addons(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, addon_id)
);
```

Kebutuhan admin:

- Di detail/form product, tambahkan section untuk memilih addons yang tersedia untuk product tersebut.
- Pilihan addons dikelompokkan berdasarkan `category`.
- Admin bisa memilih addons mana saja yang berlaku untuk product.
- Jika tidak ada addons yang dipilih untuk product, product menggunakan global addons aktif sebagai default.

### 5. Refactor Penyimpanan Order

Tambahkan kolom baru untuk menyimpan pilihan custom order dalam bentuk `JSONB`.

```sql
ALTER TABLE orders ADD COLUMN customized_options JSONB;
```

Contoh data:

```json
{
  "size": { "name": "8cm", "price": 10000 },
  "flavor": { "name": "Coklat", "price": 0 },
  "color": { "name": "Hitam", "price": 5000, "is_dark_color": true },
  "crown": { "name": "Gold Crown", "price": 10000 },
  "glitter": { "name": "test1", "price": 0 },
  "cake_topper": { "selected": true, "price": 150000 }
}
```

Saat order dibuat:

- Simpan semua pilihan addons user ke `orders.customized_options`.
- Simpan `name` dan `price` saat checkout supaya histori order tidak berubah jika data addons global diedit setelah order dibuat.
- Total harga order harus menghitung harga product + semua `price` dari customized options.

## Acceptance Criteria

- Field addons statis sudah tidak muncul di form product admin.
- Menu global addons tersedia di admin.
- Global addons bisa dibuat, diedit, diaktifkan, dan dinonaktifkan.
- Data global addons ditampilkan dengan grouping berdasarkan `category`.
- User tetap bisa memilih addons ketika melakukan order.
- Pilihan addons user diambil dari `global_addons` atau `product_addons`.
- Product bisa memiliki konfigurasi addons khusus.
- Order baru menyimpan pilihan addons ke `orders.customized_options`.
- Perhitungan total order menggunakan harga addons dari pilihan user.
- Data order lama tetap aman dan tidak error ketika `customized_options` masih `NULL`.

## Catatan Migrasi

- Tambahkan migration untuk table `global_addons`.
- Tambahkan migration untuk table `product_addons`.
- Tambahkan migration untuk kolom `orders.customized_options`.
- Pertimbangkan migrasi data addons lama dari field product ke `global_addons`.
- Pastikan bagian invoice/email/order detail membaca data addons dari `customized_options`.
