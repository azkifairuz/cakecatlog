# Issue: Refactor Product Addons Active State

## Latar Belakang

Saat ini `product_addons` digunakan untuk menentukan addons khusus per product. Kebutuhan baru: admin tidak hanya bisa memilih addons khusus untuk product, tapi juga bisa mematikan addons tertentu pada product meskipun addon tersebut tersedia secara global.

Selain itu, admin juga perlu bisa langsung membuat addon baru dari flow konfigurasi product jika addon yang dibutuhkan belum ada.

## Perubahan Database

Tambahkan kolom `is_active` pada table `product_addons`.

```sql
ALTER TABLE product_addons
ADD COLUMN is_active BOOLEAN DEFAULT true;
```

Kolom ini dipakai untuk menentukan apakah addon aktif atau nonaktif untuk product tertentu.

## Tujuan

- Product bisa memiliki pengaturan aktif/nonaktif untuk setiap addon.
- Addon global tetap bisa aktif secara umum, tapi bisa dimatikan pada product tertentu.
- Admin bisa membuat addon baru langsung dari halaman product.
- User hanya melihat addons yang aktif untuk product tersebut.

## Scope Perubahan

### 1. Refactor Struktur Product Addons

Update logic `product_addons` supaya menyimpan status aktif/nonaktif.

Contoh struktur akhir:

```sql
CREATE TABLE product_addons (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES global_addons(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    PRIMARY KEY (product_id, addon_id)
);
```

### 2. Behavior Admin Product

Pada form/detail product, admin bisa:

- Melihat daftar addons global yang tersedia.
- Mengaktifkan addon untuk product tertentu.
- Menonaktifkan addon untuk product tertentu.
- Membuat addon baru jika pilihan belum tersedia.
- Addon baru yang dibuat dari halaman product otomatis tersimpan ke `global_addons`.
- Setelah addon baru dibuat, admin bisa langsung mengaktifkannya untuk product tersebut.

### 3. Behavior Product Addons

Jika product punya data di `product_addons`:

- Tampilkan hanya addon dengan `product_addons.is_active = true`.
- Addon dengan `product_addons.is_active = false` tidak ditampilkan ke user untuk product tersebut.
- Status `global_addons.is_active` tetap harus diperhatikan.
- Addon hanya tampil jika:

```text
global_addons.is_active = true
AND product_addons.is_active = true
```

Jika product belum punya data di `product_addons`:

- Gunakan semua `global_addons` yang aktif sebagai default.

### 4. Behavior User

Pada halaman product user:

- Pilihan addons tetap ditampilkan seperti sekarang.
- Data diambil dari `product_addons` jika product punya konfigurasi khusus.
- Addons yang dinonaktifkan untuk product tertentu tidak muncul.
- Jika tidak ada konfigurasi khusus, fallback ke global addons aktif.

### 5. Flow Membuat Addon Baru dari Product

Tambahkan opsi di form product untuk membuat addon baru.

Field minimal:

- `category`
- `name`
- `additional_price`
- `is_dark_color`
- `dark_color_surcharge`
- `is_active`

Setelah addon baru dibuat:

- Insert ke `global_addons`.
- Insert relasi ke `product_addons`.
- Set `product_addons.is_active = true`.

## Acceptance Criteria

- Migration `product_addons.is_active` tersedia.
- Admin bisa mengaktifkan/nonaktifkan addon per product.
- Admin bisa membuat addon baru dari halaman product.
- Addon baru otomatis tersimpan ke `global_addons`.
- Addon baru bisa langsung dikaitkan ke product.
- User hanya melihat addons yang aktif secara global dan aktif untuk product tersebut.
- Product tanpa konfigurasi khusus tetap memakai global addons aktif.
- Order tetap menyimpan pilihan addons ke `customized_options`.
- Data lama di `product_addons` tetap aman karena default `is_active = true`.

## Catatan Implementasi

- Query product addons perlu mengambil `product_addons.is_active`.
- UI admin product perlu membedakan:
  - addon aktif untuk product
  - addon nonaktif untuk product
  - addon global aktif tapi belum dikonfigurasi di product
- Saat menyimpan form product, jangan hanya delete semua relasi lalu insert ulang tanpa mempertahankan status jika admin memang ingin menonaktifkan addon.
- Pertimbangkan upsert ke `product_addons` untuk menjaga status `is_active`.
