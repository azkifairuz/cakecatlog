# Panduan Manual & Penjelasan Field Pembuatan Produk dan Addons
Selamat datang di panduan manual sistem manajemen produk dan addons untuk platform **dessertbyfir**. Panduan ini disusun secara berurutan dari langkah pertama hingga hasil akhir di sisi pelanggan (User) untuk mempermudah Anda dalam memahami setiap field dan alur kerja.

---

## 📸 Galeri Langkah (Alur Cepat)
Gunakan slider di bawah ini untuk melihat pratinjau cepat setiap halaman dari Langkah 1 sampai Langkah 8:

````carousel
![Langkah 1: Halaman List Addons](/Users/macbookprom1/images/1.menu%20list%20addons.png)
<!-- slide -->
![Langkah 2: Form Tambah Addon](/Users/macbookprom1/images/2.form%20tambah%20addons.png)
<!-- slide -->
![Langkah 3: List Menu Product](/Users/macbookprom1/images/3.menu%20list%20product.png)
<!-- slide -->
![Langkah 4: Form Product - Detail Utama](/Users/macbookprom1/images/4.menu%20form%20product%201.png)
<!-- slide -->
![Langkah 5: Form Product - Media & Toggle](/Users/macbookprom1/images/5.menu%20form%20product%202.png)
<!-- slide -->
![Langkah 6: Form Product - Modifikasi Addons](/Users/macbookprom1/images/6.%20menu%20form%20product%203.png)
<!-- slide -->
![Langkah 7: Hasil di Detail Admin](/Users/macbookprom1/images/7.result%20di%20%20product%20detaila%20dmin.png)
<!-- slide -->
![Langkah 8: Hasil Pilihan di Sisi User](/Users/macbookprom1/images/8.%20dihalam%20user,%20field%20pilihan%20nya%20akna%20mengikiti%20product%20addons%20konfigurasi%20global%20ataupun%20custom%20per%20product.png)
````

---

## 📖 Penjelasan Detail Langkah Demi Langkah

### 1. Halaman Utama Global Addons
Halaman ini digunakan untuk mengelola daftar opsi tambahan (addons) yang bersifat global. Addon global ini nantinya dapat digunakan oleh berbagai produk kue yang Anda buat.

![Halaman List Addons](/Users/macbookprom1/images/1.menu%20list%20addons.png)

* **Fungsi Utama**: Menyediakan daftar seluruh addons yang dikelompokkan berdasarkan kategori (seperti *Size*, *Crown*, Lilin, dll.) serta opsi untuk menambah kategori baru (misalnya *Warna*, *Decoration*).
* **Fitur di Halaman Ini**:
  * **Kolom Pencarian (*Cari addon...*)**: Untuk mencari addon secara cepat berdasarkan namanya.
  * **Dropdown Kategori (*Semua Kategori*)**: Filter untuk mempermudah penyaringan addon berdasarkan kelompok tertentu.
  * **Tampilan**: Toggle untuk mengubah model tampilan list menjadi Grid atau List.
  * **Tombol "+ Tambah Baru"**: Menampilkan modal form untuk membuat addon global baru.
  * **Daftar Card Addons**: Menampilkan info addon yang ada, status keaktifan (menggunakan toggle switch), tombol **Edit**, dan **Delete**.

---

### 2. Form Tambah / Edit Addon
Ketika Anda mengklik tombol "+ Tambah Baru" pada halaman addons, modal form di bawah ini akan muncul.

![Form Tambah Addons](/Users/macbookprom1/images/2.form%20tambah%20addons.png)

* **Penjelasan Field**:
  1. **Category**: Menentukan kelompok/kategori dari addon tersebut. Anda dapat memilih dari kategori yang sudah ada (misalnya: `glitter`, `size`, `crown`) atau mengetikkan kategori baru (misalnya: `warna` / `color`). Pengelompokan ini akan menyusun tampilan opsi pilihan di halaman pelanggan.
  2. **Nama**: Nama spesifik dari opsi addon (contoh: `edible_glitter`, `Gold`, `12cm`).
  3. **Additional Price**: Nominal harga tambahan yang akan otomatis dijumlahkan ke harga dasar produk jika opsi ini dipilih oleh user.
  4. **Aktif (Tampilkan addon ini ke user) [Toggle]**: Jika diaktifkan (ON), addon akan tersedia untuk digunakan/ditampilkan ke user.
  5. **Warna Gelap (Aktifkan surcharge warna gelap) [Toggle]**: Pengaturan khusus untuk mengaktifkan biaya tambahan (surcharge) jika pelanggan memilih warna dasar kue yang gelap.
     > [!NOTE]
     > Detail operasional dan aturan biaya untuk fitur *Warna Gelap* akan dijelaskan secara manual secara terpisah.

---

### 3. Halaman Utama Produk (Admin)
Halaman katalog produk di sisi admin untuk memantau semua produk kue yang aktif maupun tidak aktif.

![List Menu Product](/Users/macbookprom1/images/3.menu%20list%20product.png)

* **Kolom Tabel**:
  * **Image**: Foto utama dari produk kue.
  * **Name & Category**: Nama produk beserta kategori kue yang disematkan (contoh: `test azki2` kategori `Lily Cake`).
  * **Start from**: Harga dasar terendah dari produk kue tersebut.
  * **Status**: Status ketersediaan produk saat ini (`Available` jika aktif dan bisa dipesan, atau `Unavailable` jika kosong/di-nonaktifkan).
  * **Actions**: 
    * **Detail**: Membuka ringkasan spesifikasi produk.
    * **Edit**: Mengubah data produk.
    * **Delete**: Menghapus produk dari database admin.
  * **Tombol "+ Add New Product"**: Tombol di pojok kanan atas untuk memulai pembuatan produk kue baru.

---

### 4. Form Pembuatan Produk - Detail Utama (Bagian 1)
Ini adalah bagian atas formulir pembuatan produk baru (*Add New Product*).

![Form Product - Detail Utama](/Users/macbookprom1/images/4.menu%20form%20product%201.png)

* **Penjelasan Field**:
  1. **Product Name \*** (Wajib diisi): Nama produk kue yang akan tampil di katalog utama (contoh: `test azki 3`).
  2. **Category**: Pilihan kategori jenis kue dari dropdown (contoh: `Bow Cake`).
  3. **Harga Dasar (Rp) \*** (Wajib diisi): Harga awal minimum untuk kue sebelum ditambahkan opsi kustomisasi/addon apa pun (contoh: `Rp 1.000.000`).
  4. **Description**: Deskripsi lengkap mengenai rasa, bahan, atau informasi penting lainnya tentang kue.
  5. **Handling Warning (Peringatan Penanganan Khusus)**: Instruksi penanganan khusus untuk kurir atau pelanggan agar kue tidak rusak saat pengantaran (misalnya: *Simpan di tempat dingin*, *Bawa dengan hati-hati*).

---

### 5. Form Pembuatan Produk - Media & Ketersediaan (Bagian 2)
Bagian bawah dari formulir pembuatan produk sebelum disimpan.

![Form Product - Media & Toggle](/Users/macbookprom1/images/5.menu%20form%20product%202.png)

* **Penjelasan Field & Opsi**:
  1. **Modifikasi Addons [Toggle]**:
     * **Jika OFF**: Produk ini secara otomatis akan memakai konfigurasi addons secara global default. Semua addon global yang aktif akan ditampilkan pada produk ini.
     * **Jika ON**: Membuka pengaturan kustomisasi addon khusus untuk produk ini (akan memunculkan menu di Langkah 6).
  2. **Product Images (Max 5)**: Area unggah foto produk. Maksimal 5 foto.
     > [!TIP]
     > Foto pertama yang Anda unggah secara otomatis akan diset sebagai gambar utama (**Primary Image**) produk.
  3. **Available for order [Checkbox]**: Centang pilihan ini untuk langsung mengaktifkan produk agar langsung bisa dipesan oleh user di aplikasi.
  4. **Tombol Save Product & Cancel**: Klik `Save Product` untuk menyimpan perubahan, atau `Cancel` untuk membatalkan pembuatan.

---

### 6. Form Pembuatan Produk - Kustomisasi Addons (Bagian 3)
Bagian formulir kustomisasi addons ini hanya akan muncul apabila toggle **Modifikasi Addons** diaktifkan (ON).

![Form Product - Modifikasi Addons](/Users/macbookprom1/images/6.%20menu%20form%20product%203.png)

* **Fitur & Pilihan Status**:
  * **Tambah Addon Baru (`+ Addon`)**: Memungkinkan Anda membuat addon baru secara instan dari halaman produk ini. Addon yang dibuat di sini otomatis masuk ke daftar addons global dan statusnya langsung aktif secara khusus untuk produk ini.
  * **Pilihan Status Addon**:
    Setiap opsi addon global yang terdaftar akan ditampilkan di sini dan dikelompokkan per kategori (*CROWN*, *GLITTER*, *SIZE*). Admin dapat memilih 1 dari 3 status untuk masing-masing opsi addon:
    1. **Default**: Addon akan mengikuti status aktif/nonaktif dari konfigurasi global.
    2. **Aktif**: Addon dipaksa aktif dan ditampilkan khusus untuk produk ini.
    3. **Nonaktif**: Addon disembunyikan/dimatikan khusus untuk produk ini (misalnya jika ukuran kue tertentu atau glitter tidak cocok untuk produk kue ini).

---

### 7. Hasil di Detail Admin
Setelah produk berhasil disimpan, admin dapat melihat ringkasan produk melalui modal Detail.

![Hasil di Detail Admin](/Users/macbookprom1/images/7.result%20di%20%20product%20detaila%20dmin.png)

* **Informasi yang Ditampilkan**:
  * Nama produk (`test azki 3`), Kategori (`Bow Cake`), dan badge Status (`Available`).
  * Galeri Produk yang menampilkan foto utama bertanda `Primary`.
  * Informasi harga dasar (`Rp1.000.000,00`).
  * Deskripsi produk.
  * **Opsi Kustomisasi**: Menunjukkan status pengaturan addon (contoh: *"Menggunakan global addons default."*).
  * Tombol **Edit Produk Ini** untuk langsung melakukan perubahan jika ada kesalahan pengisian.

---

### 8. Tampilan Pilihan Produk di Sisi Pelanggan (User)
Berikut adalah tampilan popup kustomisasi produk ketika pelanggan (user) memilih kue untuk ditambahkan ke keranjang belanja (*Add to Cart*).

![Hasil Pilihan di Sisi User](/Users/macbookprom1/images/8.%20dihalam%20user,%20field%20pilihan%20nya%20akna%20mengikiti%20product%20addons%20konfigurasi%20global%20ataupun%20custom%20per%20product.png)

* **Bagaimana Field pada Pelanggan Terbentuk**:
  1. **SIZE \***: Pilihan dropdown ukuran kue (dihasilkan dari addon kategori `SIZE`). Menampilkan harga dasar masing-masing ukuran (contoh: `8cm - IDR 10,000.00`).
  2. **QUANTITY \***: Input jumlah kue yang ingin dipesan.
  3. **CROWN OPTION**: Dropdown pilihan mahkota (dihasilkan dari addon kategori `CROWN`). Menampilkan opsi beserta harga tambahannya (contoh: `Gold (+IDR 200,000.00)`).
  4. **EDIBLE GLITTER**: Dropdown pilihan glitter (dihasilkan dari addon kategori `GLITTER`). Menampilkan opsi beserta harga tambahannya (contoh: `edible_glitter (+IDR 1,500,000.00)`).
  5. **CAKE TOPPER [Checkbox]**: Pilihan opsional topper kue dengan biaya tambahan flat (contoh: `Additional fee IDR 150,000.00`).
  6. **GIFT CARD TEXT**: Kolom teks bebas bagi pelanggan yang ingin menulis ucapan di kartu ucapan.
  7. **EXTRA REQUEST / CAKE TEXT**: Kolom teks bebas untuk catatan tambahan pelanggan seperti lilin, tulisan di atas kue, atau detail bentuk khusus.
