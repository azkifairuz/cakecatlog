# RENCANA PENGERJAAN (PLANNING): Hero Banner Carousel & Admin Panel

Dokumen ini berisi panduan spesifikasi dan daftar tugas (task list) tingkat tinggi (high-level) untuk merombak bagian Hero Banner di halaman depan website menjadi full-width dan full-height auto-sliding carousel, yang dikelola secara dinamis melalui Admin Dashboard.

---

## 📋 GAMBARAN UMUM & TUJUAN DESAIN

1. **Kondisi Sekarang**: Hero section saat ini menggunakan layout dua kolom statis dengan container terbatas dan satu gambar melingkar di sebelah kanan.
2. **Kondisi Baru**: 
   - Banner harus memenuhi seluruh lebar dan tinggi layar (`full-width` & `100dvh` full-height).
   - Gambar latar belakang berganti secara otomatis (carousel) dengan transisi mulus.
   - Teks judul (**DESERTBYFIR**) dan tombol aksi (**ORDER CAKE**) bersifat menetap (statis) sebagai lapisan overlay di atas gambar yang bergeser.
   - Gambar dikelola oleh admin dan disimpan di database (Supabase) dengan aturan: **minimal 2 gambar aktif, maksimal 5 gambar aktif**.
   - Optimasi gambar dilakukan untuk menjamin kecepatan load web (LCP optimal).

---

## 🗄️ 1. TUGAS TIM DATABASE (DB TEAM)

Fokus: Membuat media penyimpanan database dan bucket file storage di Supabase.

- [ ] **Desain Tabel Database `hero_banners`**
  - Buat tabel baru bernama `hero_banners` dengan kolom:
    * `id` (UUID, Primary Key, Auto-generated)
    * `image_url` (Text, URL lengkap gambar banner)
    * `display_order` (Integer, urutan tampilan banner di carousel)
    * `is_active` (Boolean, default `true` untuk menandakan banner aktif/muncul)
    * `created_at` & `updated_at` (Timestamps)
  - Aktifkan fitur Row Level Security (RLS).

- [ ] **Konfigurasi Kebijakan Keamanan (RLS Policies)**
  - Buat policy baca publik: Semua user (anonymous) dapat melakukan `SELECT` pada data yang memiliki `is_active = true`.
  - Buat policy tulis admin: Hanya pengguna terautentikasi (admin) yang dapat melakukan operasi Write (`INSERT`, `UPDATE`, `DELETE`).

- [ ] **Buat Storage Bucket `banners` di Supabase**
  - Buat bucket baru bernama `banners` dengan akses **Public**.
  - Buat policy agar publik dapat membaca file gambar secara langsung melalui URL public.
  - Buat policy agar proses unggah (upload), pembaruan, dan penghapusan file gambar hanya bisa dilakukan oleh user yang telah terautentikasi (admin).

---

## 👑 2. TUGAS TIM ADMIN DASHBOARD (ADMIN TEAM)

Fokus: Membuat halaman manajemen khusus untuk mengunggah, mengurutkan, dan mengatur status aktif banner.

- [ ] **Tambahkan Navigasi Menu Admin**
  - Edit layout admin dashboard ([src/routes/admin/dashboard/+layout.svelte](file:///Users/macbookprom1/projects/formjualkue/src/routes/admin/dashboard/+layout.svelte)).
  - Tambahkan link rute baru menuju `/admin/dashboard/banners` baik di sidebar/header navigasi desktop maupun bottom navigation mobile.

- [ ] **Buat Logika Server-side (`src/routes/admin/dashboard/banners/+page.server.js`)**
  - **Fungsi Load**: Tarik seluruh baris dari tabel `hero_banners` diurutkan berdasarkan `display_order`.
  - **Fungsi Save Actions**:
    * Terima data unggahan file gambar baru dan simpan ke Supabase storage bucket `banners`.
    * Perbarui status aktif (`is_active`) dan urutan (`display_order`) dari banner yang sudah ada.
    * Hapus file gambar dari storage bucket jika admin menghapus banner dari list dashboard.
  - **Validasi Bisnis (PENTING)**:
    * Sebelum menyimpan perubahan ke database, hitung jumlah total banner yang aktif (data lama yang aktif + data baru).
    * Batasi: **Minimal 2 banner aktif** dan **Maksimal 5 banner aktif**. Jika kurang dari 2 atau lebih dari 5, batalkan transaksi dan kirim respon error ke user.

- [ ] **Buat Antarmuka Admin (`src/routes/admin/dashboard/banners/+page.svelte`)**
  - Tampilkan list banner saat ini beserta thumbnail gambarnya.
  - Sediakan input kontrol untuk:
    * Mengatur urutan (input angka urutan atau tombol up/down).
    * Mengaktifkan/menonaktifkan banner (checkbox).
    * Menghapus banner (tombol hapus).
    * Menambahkan gambar banner baru (form upload file gambar).
  - Tampilkan pesan error validasi (dari sisi server maupun klien) jika jumlah gambar aktif tidak sesuai aturan 2-5 banner.

---

## 🎨 3. TUGAS TIM FRONT-END (FE TEAM)

Fokus: Mengganti hero section lama dengan slideshow responsif berkinerja tinggi.

- [ ] **Ambil Data di Homepage (`src/routes/+page.server.js`)**
  - Tambahkan fungsi query untuk mengambil data dari tabel `hero_banners` yang statusnya aktif (`is_active = true`) terurut berdasarkan `display_order`.
  - Teruskan data tersebut ke halaman frontend sebagai properti load.

- [ ] **Buat Komponen Slideshow (`src/lib/components/HeroCarousel.svelte`)**
  - Buat komponen carousel menggunakan Svelte 5.
  - **Tata Letak**:
    * Gunakan full-screen height (`h-screen` atau `h-[100dvh]`) dan full-width (`w-full`) untuk container slider.
    * Atur gambar agar menutupi layar (`object-cover object-center w-full h-full`).
  - **Logika Slider**:
    * Jalankan timer otomatis (auto-slide) menggunakan interval 5 detik untuk memutar gambar aktif.
    * Berikan animasi transisi yang halus (contoh: efek fade-in/fade-out) pada perpindahan slide.
    * Sediakan navigasi indikator dot kecil di bagian bawah tengah sebagai penanda slide aktif.
    * Sediakan data fallback berupa daftar gambar default di kode program jika database kosong.
  - **Lapisan Overlay Statis (Sesuai Permintaan)**:
    * Teks nama website **DESERTBYFIR** (dan sub-teks deskripsi) beserta tombol aksi **ORDER CAKE** diletakkan di luar loop carousel sebagai overlay absolute dengan z-index tinggi.
    * Ini memastikan teks tetap diam (statis) tidak bergerak di tengah layar saat gambar latar belakang di bawahnya berganti otomatis.
    * Hubungkan link tombol **ORDER CAKE** ke bagian katalog produk (`#catalog`).

- [ ] **Optimasi Performa Pemuatan Gambar (LCP & SEO)**
  - **Priority Loading**: Berikan atribut `loading="eager"` dan `fetchpriority="high"` khusus pada tag img slide pertama (index 0).
  - **Lazy Loading**: Gunakan `loading="lazy"` pada gambar slide-slide berikutnya agar tidak membebani pemuatan pertama halaman web.
  - **Kompresi URL**: Gunakan query parameter pada URL Supabase Storage untuk meminta resolusi gambar yang sesuai dengan layar (contoh: batasi lebar max 1920px dan quality 80) guna memperkecil ukuran payload gambar.

- [ ] **Integrasikan ke Halaman Utama (`src/routes/+page.svelte`)**
  - Impor komponen `HeroCarousel` ke file halaman utama.
  - Hapus kode hero section lama, lalu gantikan dengan `<HeroCarousel banners={data.banners} />` di paling atas halaman.
