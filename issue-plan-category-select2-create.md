# Issue Planning: Create Category dari Searchable Select

## Latar Belakang

Saat ini pemilihan category masih menggunakan select biasa. Untuk admin, UX bisa dibuat lebih rapi dengan searchable select seperti Select2. Selain bisa mencari category yang sudah ada, admin juga bisa mengetik category baru dan membuatnya langsung dari form.

## Tujuan

- Admin bisa mencari category dari dropdown.
- Admin bisa membuat category baru jika category belum tersedia.
- Pembuatan category baru harus melalui modal validasi/konfirmasi.
- Setelah category baru berhasil dibuat, category otomatis terpilih di form.

## Scope

### 1. Ganti Input Category Menjadi Searchable Select

Gunakan komponen searchable select yang UX-nya seperti Select2.

Kebutuhan:

- Bisa search category berdasarkan nama.
- Bisa memilih category existing.
- Bisa mendeteksi input yang belum ada di daftar category.
- Jika input belum ada, tampilkan opsi `Create new category`.

### 2. Flow Create Category Baru

Jika admin mengetik category yang belum ada:

1. Tampilkan opsi untuk membuat category baru.
2. Saat opsi dipilih, jangan langsung insert.
3. Buka modal validasi/konfirmasi.
4. Modal menampilkan nama category yang akan dibuat.
5. Admin harus confirm sebelum category dibuat.

Contoh isi modal:

- Judul: `Buat Category Baru?`
- Deskripsi: `Category "{nama}" belum tersedia. Yakin ingin membuat category ini?`
- Tombol:
  - `Cancel`
  - `Create Category`

### 3. Validasi Category Baru

Sebelum insert category baru:

- Nama category wajib diisi.
- Trim spasi di awal/akhir.
- Cegah duplicate category dengan perbandingan case-insensitive.
- Generate `slug` dari nama category.
- Jika slug sudah ada, tampilkan error.

Contoh:

```text
Nama: Birthday Cake
Slug: birthday-cake
```

### 4. Setelah Category Berhasil Dibuat

Setelah insert berhasil:

- Refresh daftar category.
- Pilih category baru otomatis di form product.
- Tutup modal.
- Tampilkan feedback sukses.

### 5. Error Handling

Tampilkan error jika:

- Category kosong.
- Category sudah ada.
- Insert database gagal.
- Slug duplicate.

## Acceptance Criteria

- Dropdown category bisa search.
- Admin bisa memilih category existing.
- Admin bisa mengetik category baru.
- Opsi create hanya muncul jika category belum ada.
- Create category baru membuka modal validasi terlebih dahulu.
- Category tidak dibuat sebelum admin confirm.
- Category baru tersimpan ke table `categories`.
- Category baru otomatis terpilih setelah berhasil dibuat.
- Duplicate category dicegah secara case-insensitive.
- UI tetap nyaman digunakan di desktop dan mobile.

## Catatan Implementasi

- Jika tidak memakai library Select2 asli, buat komponen custom searchable select dengan behavior yang sama.
- Hindari menambah dependency jika existing UI sudah cukup untuk membuat combobox.
- Untuk create category, bisa menggunakan SvelteKit action khusus, misalnya `createCategory`.
- Pastikan form product tetap bisa submit normal setelah category baru dibuat.
- Pertimbangkan unique constraint untuk `categories.slug` jika belum ada.
