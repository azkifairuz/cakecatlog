# EPIC: Migrasi Flow Pemesanan ke Sistem Keranjang (Shopping Cart)

## 📌 Deskripsi Pekerjaan (Overview)
Saat ini, alur (flow) pemesanan bersifat *direct checkout* (satu pesanan hanya untuk satu produk beserta detailnya). Kebutuhan bisnis mengharuskan pelanggan dapat memesan **lebih dari satu kue/item dengan detail kustomisasi yang berbeda-beda** dalam **satu kali transaksi (checkout)**.

Perubahan ini merupakan perombakan arsitektur besar (Major Refactor) yang mencakup struktur Database, State Management (Frontend), dan Admin Dashboard.

---

## 🗄️ 1. Perombakan Database (Supabase)
Tabel `orders` saat ini menggabungkan data informasi pelanggan dan detail item kue. Ini harus dipecah menjadi relasi *One-to-Many* (Parent-Child).

### A. Tabel `orders` (Parent - Data Transaksi & Pelanggan)
Fokus hanya pada identitas pemesan dan pengiriman:
- `id` (UUID, Primary Key)
- `created_at` (Timestamp)
- `customer_name` (Text)
- `phone_number` (Text)
- `address` (Text)
- `delivery_date` (Date)
- `delivery_time` (Time)
- `status` (Text: Pending, Processed, dll)
- `total_price` (Numeric - *opsional, sangat disarankan*)

### B. Buat Tabel Baru: `order_items` (Child - Detail per Kue)
Tabel ini menyimpan konfigurasi spesifik untuk masing-masing kue dalam satu keranjang:
- `id` (UUID, Primary Key)
- `order_id` (UUID, Foreign Key ke `orders.id` dengan relasi *Cascade Delete*)
- `product_id` (UUID, Foreign Key ke `products.id`)
- `quantity` (Integer)
- `cake_size` (Text)
- `cake_flavor` (Text)
- `cake_color`, `crown_option`, `add_edible_glitter` (Text)
- `cake_text` (Add-on request), `gift_card_text` (Text)
- `reference_image_url` (Text)
- `price_at_order` (Numeric - *harga satuan saat dipesan*)

---

## 💻 2. Frontend State Management (Keranjang/Cart)
Karena pelanggan akan berpindah-pindah halaman produk, data keranjang harus persisten.
- **Svelte Store / Svelte 5 Global State**: Buat file khusus (misal: `src/lib/stores/cart.svelte.js` atau context global) untuk menampung *array of objects* dari item-item yang ingin dibeli.
- **Local Storage (Opsional tapi disarankan)**: Simpan data *state* keranjang ke dalam `localStorage` browser agar keranjang tidak hilang jika pelanggan me-refresh halaman.

---

## 🎨 3. Perubahan Flow UI/UX & Routing (Frontend)

### A. Halaman Produk (`/product/[id]`)
- Pindahkan semua field form kustomisasi kue (Ukuran, Rasa, Warna, Upload Gambar Referensi, Tulisan, dll) ke halaman Detail Produk ini (atau buat menjadi *Pop-up/Modal*).
- Tombol **"Pesan Sekarang"** diubah logikanya menjadi **"Tambah ke Keranjang" (Add to Cart)**. Tombol ini tidak lagi melempar ke halaman form identitas.

### B. Komponen Keranjang (Cart UI)
- Buat komponen `CartDrawer` (Slide-over dari samping) atau halaman khusus `/cart` yang menampilkan list kue apa saja yang sudah masuk beserta tombol "Hapus" dan total harga sementara.
- Di sinilah pelanggan bisa melihat rekap apa saja yang akan dipesan.
- Tambahkan tombol **"Lanjut ke Pembayaran / Checkout"**.

### C. Halaman Checkout Baru (`/checkout`)
- Halaman ini HANYA berisi Form Informasi Pelanggan dan Pengiriman:
  - Nama Lengkap
  - No WhatsApp
  - Alamat Pengiriman
  - Tanggal & Waktu Pengiriman
- **Aksi Submit (`+page.server.js`)**:
  - Saat form di-submit, payload yang dikirim ke server berisi data pelanggan + *array of cart items*.
  - *Backend logic*: Lakukan **Transaction** atau Insert berurutan. Pertama, `INSERT` ke tabel `orders` untuk mendapatkan `order_id`. Kedua, lakukan *bulk* `INSERT` ke tabel `order_items` dengan menyematkan `order_id` tersebut.

### D. Halaman Katalog Utama (Homepage / Product List)
- **Tombol Quick Add**: Tambahkan tombol atau ikon "Keranjang" pada setiap kartu produk (Product Card) di halaman katalog utama agar user bisa memesan langsung tanpa harus masuk ke halaman detail.
- **Modal Konfigurasi Produk**: Ketika tombol *Add to Cart* di katalog ditekan, munculkan sebuah **Modal / Pop-up** yang melayang di layar. Modal ini berisi form kustomisasi detail kue (pilihan ukuran, rasa, warna, teks ucapan, dll) yang serupa dengan halaman detail produk.
- **Alur Modal**: Setelah form dalam modal diisi dan tombol "Simpan ke Keranjang" ditekan, data item tersebut langsung di-push ke dalam *Global State* keranjang, modal otomatis tertutup, dan munculkan notifikasi ringan (Toast) bahwa "Kue berhasil ditambahkan ke keranjang".

---

## 🛠️ 4. Perombakan Admin Dashboard

### A. Halaman List Pesanan (`/admin/dashboard/orders`)
- Query database harus diubah. Saat menampilkan list pesanan, tarik data dari tabel `orders` dan lakukan *JOIN* atau *Subquery* (menggunakan syntax relasi Supabase, cth: `select('*, order_items(*, products(name))')`) untuk menarik detail item yang dibeli.
- Tampilan tabel (kolom Produk & Detail) perlu disesuaikan agar mampu menampilkan informasi *multiple items* dalam satu row/baris (misal: ditampilkan sebagai *bullet points* atau ada tombol "Lihat Detail Item").

### B. Detail View (Jika ada)
- Jika admin mengklik sebuah pesanan, tampilkan *Card* khusus untuk profil pemesan & pengiriman, lalu di bawahnya terdapat *List/Tabel* yang merincikan kue A (ukuran apa, tulisan apa, referensi gambar apa), kue B (ukuran apa, tulisan apa), dan seterusnya.

---
---

# ISSUE: Fix Supabase RLS Error (42501) Saat Checkout Cart

## 📌 Analisis Masalah
Berdasarkan log error `42501: new row violates row-level security policy for table "orders"` dan screenshot *Policy* yang Anda berikan, berikut adalah hasil analisanya:
1. **Target Role Spesifik**: Policy `Public bisa insert pesanan` saat ini di-set hanya untuk *Target Roles:* **`anon`** (pengguna yang tidak login).
2. **Kondisi Testing Saat Ini**: Jika Anda (sebagai developer) sedang melakukan pengetesan pemesanan (flow cart) di browser yang sama dengan tab tempat Anda **login sebagai Admin**, maka *role* yang dikirim oleh Supabase Client adalah **`authenticated`**, BUKAN `anon`.
3. Akibatnya, database PostgreSQL menolak insert karena tidak ada *policy* yang mengizinkan role `authenticated` untuk melakukan *Insert* ke tabel `orders`.
4. **Masalah Pengembalian Data (Returning ID)**: Pada sistem *Cart*, setelah kita insert ke `orders`, kita wajib mengembalikan `order_id` menggunakan fungsi `.select()` agar bisa dipakai untuk *insert* ke `order_items`. Supabase mewajibkan adanya policy `SELECT` agar `.select()` tidak gagal atau *null*.

---

## ⚙️ Kebutuhan Teknis (High-Level Planning Fix)

### 1. Ubah Target Role pada Policy `INSERT`
- Masuk ke dashboard Supabase -> **Authentication** -> **Policies** (atau Table Editor -> RLS).
- Edit policy **"Public bisa insert pesanan"**.
- Pada bagian **Target Roles**, tambahkan role **`authenticated`** sehingga policy ini berlaku untuk dua role sekaligus: `anon` DAN `authenticated`. 
- *(Alternatif)*: Anda bisa membiarkan kolom Target Roles kosong agar otomatis berlaku untuk semua peran (ALL).

### 2. Tambahkan Policy `SELECT` (Wajib untuk Flow Cart)
- Buat *Policy* baru untuk tabel `orders`.
- **Policy Name**: `Bisa membaca pesanan` (atau sejenisnya).
- **Policy Command**: Pilih **SELECT**.
- **Target Roles**: `anon` dan `authenticated`.
- **Policy Behavior**: Permissive.
- **Using Expression**: `true` (jika ingin semua orang bisa membaca sementara) atau lebih amannya menggunakan *session matching* (walaupun untuk *anon* akan sedikit menantang, untuk tahap *development/testing* `true` sudah cukup). Ini sangat penting agar perintah `.insert(data).select('id')` bisa berhasil mengembalikan ID dari tabel induk.

### 3. Buat Policy untuk Tabel `order_items`
Karena flow cart memecah pesanan menjadi 2 tabel, Anda juga **WAJIB** membuat RLS Policy untuk tabel anak (`order_items`).
- Buat policy **INSERT** untuk `order_items` dengan Target Roles: `anon` & `authenticated` (dengan `with check: true`).
- Buat policy **SELECT** untuk `order_items` agar bisa dibaca saat pemesanan selesai.

---
---

# ISSUE: Fitur Kelola Harga & Ongkos Kirim (Admin Order Management)

## 📌 Deskripsi Pekerjaan
Biasanya pada pemesanan kue custom, ongkos kirim (ongkir) dihitung secara manual oleh admin berdasarkan jarak dan jenis kendaraan pengiriman (Mobil/Motor) untuk menjaga keamanan kue. 
Oleh karena itu, diperlukan sebuah fitur **Kelola Harga** di halaman Admin Dashboard. Fitur ini memungkinkan admin untuk menginput Biaya Pengiriman, menentukan tipe kendaraan, serta mengakumulasi total harga (Harga Kue + Ongkir) sebelum tagihan final diberikan kepada pembeli.

---

## ⚙️ Kebutuhan Teknis (High-Level Plan)

### 1. Modifikasi Database (Tabel `orders`)
Tambahkan 3 kolom baru pada tabel `orders` di Supabase untuk menampung rincian biaya:
- `cake_price` (Numeric): Total harga kue (opsional jika sudah dihitung dari `order_items`, tapi berguna jika ada penyesuaian/diskon manual).
- `delivery_fee` (Numeric): Biaya ongkos kirim.
- `delivery_vehicle` (Text): Jenis kendaraan yang digunakan (contoh value: `"Car"`, `"Bike"`, atau `"Pickup"`).
- `total_price` (Numeric): Total akhir tagihan.

### 2. Form Kelola Harga di Admin Dashboard (`/admin/dashboard/orders/[id]`)
- Buat seksi/komponen UI baru bernama **"Kelola Harga & Pengiriman"** pada halaman detail pesanan di sisi Admin.
- **Input Fields yang dibutuhkan**:
  1. **Harga Kue**: Gunakan komponen `PriceInput.svelte` (berformat pemisah ribuan/titik) yang sebelumnya sudah direncakan.
  2. **Biaya Pengiriman (Ongkir)**: Gunakan komponen `PriceInput.svelte`.
  3. **Tipe Kendaraan (Vehicle)**: Gunakan elemen `<select>` atau *Radio Button* dengan opsi: **Car** (Mobil) dan **Bike** (Motor).
- **Kalkulasi Otomatis (Reactivity)**: Gunakan state Svelte (Runes `$state` / `$derived`) agar *Total Harga* otomatis terjumlah secara *real-time* ketika admin mengetik Harga Kue dan Ongkir.
- **Aksi (Server Action)**: Tombol "Simpan Tagihan" yang menembak fungsi update ke Supabase untuk mengubah nilai kolom-kolom terkait pada baris ID pesanan tersebut.

### 3. Pembaruan Flow Cetak Tagihan / WhatsApp (Opsional)
- Setelah Admin men-set harga dan mengklik "Kirim Tagihan", format pesan WhatsApp yang *ter-generate* kepada pelanggan harus menyertakan rincian baru ini:
  - Total Harga Kue: Rp ...
  - Ongkos Kirim (Via Mobil/Motor): Rp ...
  - **TOTAL TAGIHAN: Rp ...**

---
---

# ISSUE: Fix Perhitungan Omset (Hanya Pesanan Selesai)

## 📌 Deskripsi Pekerjaan
Saat ini, kartu informasi Omset (Revenue) di halaman Admin Dashboard menghitung semua pesanan yang masuk, termasuk pesanan yang baru dibuat (Pending) atau bahkan dibatalkan (Canceled). 
Kalkulasi ini harus diperbaiki agar **hanya menghitung pesanan dengan status 'Selesai' (Completed)** untuk memberikan laporan keuangan yang valid.

---

## ⚙️ Kebutuhan Teknis (High-Level Plan)

### 1. Perbaikan Query Database (`+page.server.js`)
- **Lokasi File**: Cari file *server actions/load* yang bertugas mengambil data analytics untuk Admin Dashboard (kemungkinan berada di `src/routes/admin/dashboard/+page.server.js` atau sejenisnya).
- **Filter Supabase**: Pada baris kode yang memanggil `.from('orders')` untuk menghitung total omset, tambahkan filter kondisi **`.eq('status', 'Selesai')`** (sesuaikan teks status dengan yang digunakan di sistem, misal: `'Completed'`, `'Done'`, atau `'Selesai'`).
  *Contoh Perbaikan:*
  ```javascript
  // Sebelumnya:
  // const { data } = await supabase.from('orders').select('total_price');
  
  // Perbaikan:
  const { data } = await supabase
    .from('orders')
    .select('total_price')
    .eq('status', 'Selesai'); 
  ```

### 2. Penyesuaian Tampilan Antarmuka (Opsional)
- Ubah sedikit label (teks) pada kartu *Analytics* di Admin Dashboard dari sekadar **"Total Omset"** menjadi **"Total Omset (Selesai)"** atau tambahkan *tooltip* keterangan. Hal ini berguna agar Admin tahu pasti bahwa angka tersebut murni dari uang pesanan yang sudah berstatus selesai/terbayar.
