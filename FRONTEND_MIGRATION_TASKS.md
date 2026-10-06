# Task Migrasi Frontend ke Backend API

Dokumen ini adalah checklist migrasi frontend SvelteKit dari Supabase Client langsung ke backend REST API Dessert By Fir.

## Tujuan Migrasi

- Frontend tidak lagi query database langsung lewat Supabase.
- Frontend memanggil backend API untuk data produk, kategori, addon, order, admin, upload, invoice, dan dashboard.
- Supabase Storage tetap boleh dipakai, tapi upload file dilakukan lewat backend.
- Admin login memakai token dari backend.

## Prinsip Kerja

- Kerjakan satu halaman/modul sampai selesai sebelum pindah modul lain.
- Jangan ubah desain UI dulu, fokus migrasi data.
- Simpan semua request API di helper supaya komponen Svelte tidak penuh `fetch`.
- Setelah migrasi satu halaman, tes manual halaman itu.
- Kalau response API berbeda dari data lama Supabase, buat adapter kecil di frontend.

## Env Frontend

Tambahkan env backend API:

```env
PUBLIC_API_BASE_URL=http://localhost:3000
```

Untuk production/staging, isi dengan URL backend sebenarnya.

## Struktur Helper yang Disarankan

Folder helper API di `src/lib/api/`:

```txt
src/lib/api/
  client.js
  auth.js
  public.js
  admin.js
  upload.js
  adapters.js
  index.js
```

Task:

- [x] Buat `src/lib/api/client.js`.
  - [x] Isi helper `apiFetch(path, options)`.
  - [x] Base URL ambil dari `PUBLIC_API_BASE_URL`.
  - [x] Auto parse JSON.
  - [x] Jika response error, lempar error message.
- [x] Buat helper untuk token admin.
  - [x] Simpan token di cookie `admin_access_token` & `localStorage`.
  - [x] Tambahkan header `Authorization: Bearer <token>` untuk admin API.
- [x] Buat helper `unwrapData(response)`.
  - [x] Backend response formatnya `{ success: true, data: ... }`.
  - [x] Helper ini memudahkan halaman mengambil `data`.

---

## Milestone 1 - Public Home

Halaman terkait:

- `/`
- `src/routes/+page.server.js`
- komponen home seperti hero, category, top picks.

API yang dipakai:

- `GET /home`
- `GET /home/products?category=slug`

Task:

- [x] Ganti query Supabase home ke `GET /home`.
- [x] Pastikan banner tampil.
- [x] Pastikan kategori tampil.
- [x] Pastikan produk terbaru tampil.
- [x] Pastikan top picks tampil.
- [x] Ganti endpoint `/api/home-products` lama jika sudah tidak diperlukan.
- [x] Tes klik kategori di home.

Checklist:

- [x] Home bisa dibuka tanpa login.
- [x] Banner muncul.
- [x] Product card masih menampilkan gambar, nama, harga.
- [x] Quick add/cart masih jalan.

---

## Milestone 2 - Public Catalog dan Product Detail

Halaman terkait:

- `/catalog`
- `/product/[id]`

API yang dipakai:

- `GET /products?page=1&pageSize=6&category=slug`
- `GET /products/:id`
- `GET /categories`
- `GET /addons`

Task:

- [x] Ganti load catalog dari Supabase ke API `/products`.
- [x] Ganti load categories dari Supabase ke API `/categories`.
- [x] Pastikan filter kategori jalan.
- [x] Pastikan pagination jalan.
- [x] Ganti product detail dari Supabase ke API `/products/:id`.
- [x] Pastikan varian ukuran tampil.
- [x] Pastikan addon/custom option tampil.
- [x] Pastikan add to cart tetap menyimpan data yang dibutuhkan checkout.

Checklist:

- [x] Catalog tampil.
- [x] Filter kategori tidak error.
- [x] Product detail tampil.
- [x] Pilih variant/addon lalu add to cart.

---

## Milestone 3 - Upload Helper

API yang dipakai:

- `POST /admin/uploads/product-image`
- `POST /admin/uploads/banner`
- `POST /uploads/reference-image`

Task:

- [x] Buat `src/lib/api/upload.js`.
- [x] Buat function `uploadProductImage(file)`.
- [x] Buat function `uploadBanner(file)`.
- [x] Buat function `uploadReferenceImage(file)`.
- [x] Tampilkan loading saat upload.
- [x] Tampilkan error jika ukuran/format file ditolak.
- [x] Setelah upload sukses, pakai `publicUrl` dari backend.

Flow sederhana:

```txt
User pilih file
  -> frontend upload ke backend
  -> backend balikin publicUrl
  -> frontend kirim publicUrl saat submit form
```

---

## Milestone 4 - Cart dan Checkout

Halaman terkait:

- cart drawer
- `/checkout`

API yang dipakai:

- `POST /orders/checkout`

Task:

- [x] Cek format item cart yang sekarang disimpan frontend.
- [x] Buat adapter cart item ke format backend.
- [x] Ganti submit checkout dari SvelteKit action/Supabase ke `POST /orders/checkout`.
- [x] Pastikan backend yang menghitung ulang harga.
- [x] Jika backend return `PRICE_CHANGED`, tampilkan pesan user harus refresh cart.
- [x] Setelah sukses, arahkan ke receipt.

Checklist:

- [x] Cart kosong tidak bisa checkout.
- [x] Checkout pickup berhasil.
- [x] Checkout delivery berhasil.
- [x] Error nomor WhatsApp tampil jelas.
- [x] Setelah order sukses masuk receipt.

---

## Milestone 5 - Order Form Public

Halaman terkait:

- `/order-form`
- `/form/[slug]`

API yang dipakai:

- `GET /order-form`
- `GET /order-forms/:slug`
- `POST /orders`
- `POST /uploads/reference-image`

Task:

- [x] Ganti load `/order-form` ke API `/order-form`.
- [x] Ganti load `/form/[slug]` ke API `/order-forms/:slug`.
- [x] Pastikan form custom masih bisa lock ke produk tertentu.
- [x] Saat user upload reference image, upload dulu ke `/uploads/reference-image`.
- [x] Kirim `referenceImageUrl` saat submit order.
- [x] Ganti submit order ke `POST /orders`.
- [x] Setelah sukses, arahkan ke receipt.

Checklist:

- [x] Order form default tampil.
- [x] Custom form by slug tampil.
- [x] Upload reference image berhasil.
- [x] Submit order berhasil.
- [x] `orders_count` bertambah di admin setelah order dari custom form.

---

## Milestone 6 - Receipt

Halaman terkait:

- `/order/receipt/[id]`

API yang dipakai:

- `GET /orders/:id/receipt`

Task:

- [x] Ganti load receipt dari Supabase ke API.
- [x] Pastikan data toko tampil.
- [x] Pastikan item order tampil.
- [x] Pastikan total harga tampil.

Checklist:

- [x] Receipt order valid tampil.
- [x] Receipt order tidak ditemukan tampil 404/error yang rapi.

---

## Milestone 7 - Admin Login dan Auth Guard

Halaman terkait:

- `/admin/login`
- `/admin/dashboard/*`
- logout admin

API yang dipakai:

- `POST /auth/login`
- `GET /auth/me`

Task:

- [x] Ganti login Supabase ke `POST /auth/login` (menggunakan payload `{ identifier, password }`).
- [x] Simpan `accessToken` setelah login (cookie `admin_access_token` & `localStorage`).
- [x] Buat helper `getAdminToken()`.
- [x] Buat helper `apiFetch()` / admin auth headers.
- [x] Protect halaman admin di `src/hooks.server.js`: jika tidak ada token, redirect ke `/admin/login`.
- [x] Logout hapus token lalu redirect login.
- [x] `GET /auth/me` terintegrasi di `$lib/api/auth.js`.

Checklist:

- [x] Login admin berhasil.
- [x] Token tersimpan.
- [x] Reload halaman admin tetap bisa.
- [x] Logout berhasil.
- [x] Token invalid redirect login.

---

## Milestone 8 - Admin Master Data

Halaman terkait:

- `/admin/dashboard/categories`
- `/admin/dashboard/addons`
- `/admin/dashboard/site-info`
- `/admin/dashboard/banners`

API yang dipakai:

- Categories:
  - `GET /admin/categories`
  - `POST /admin/categories`
  - `PUT /admin/categories/:id`
  - `DELETE /admin/categories/:id`
- Addons:
  - `GET /admin/addons`
  - `POST /admin/addons`
  - `PUT /admin/addons/:id`
  - `PATCH /admin/addons/:id/toggle`
  - `DELETE /admin/addons/:id`
- Site info:
  - `GET /admin/site-info`
  - `PUT /admin/site-info`
- Banners:
  - `GET /admin/banners`
  - `POST /admin/banners`
  - `PUT /admin/banners/:id`
  - `PUT /admin/banners/bulk`
  - `DELETE /admin/banners/:id`

Task:

- [x] Migrasi halaman categories.
- [x] Migrasi halaman addons.
- [x] Migrasi halaman site info.
- [x] Migrasi halaman banners.
- [x] Untuk banner image, upload file dulu ke endpoint upload banner (`POST /admin/uploads/banner`).
- [x] Setelah create/update/delete, refresh data halaman.

Checklist:

- [x] Create/edit/delete category.
- [x] Create/edit/toggle/delete addon.
- [x] Save site info.
- [x] Upload/create banner.
- [x] Reorder/toggle banner.

---

## Milestone 9 - Admin Products

Halaman terkait:

- `/admin/dashboard/products`

API yang dipakai:

- `GET /admin/products`
- `GET /admin/products/:id`
- `POST /admin/products`
- `PUT /admin/products/:id`
- `DELETE /admin/products/:id`
- `PATCH /admin/products/:id/availability`
- `POST /admin/uploads/product-image`
- `POST /admin/products/:id/images`
- `PATCH /admin/products/:id/images/:imageId/primary`
- `DELETE /admin/products/:id/images/:imageId`
- `PUT /admin/products/:id/variants`
- `PUT /admin/products/:id/addons`

Task:

- [x] Ganti list products ke API.
- [x] Ganti filter/search ke query API.
- [x] Saat create product, upload image dulu lalu kirim `imageUrl`.
- [x] Ganti create product ke API.
- [x] Ganti edit product ke API.
- [x] Ganti archive/delete product ke API.
- [x] Ganti toggle availability ke API.
- [x] Pastikan varian tersimpan.
- [x] Pastikan addon produk tersimpan.
- [x] Pastikan primary image bisa diatur.

Checklist:

- [x] Produk baru bisa dibuat lengkap.
- [x] Produk bisa diedit.
- [x] Produk bisa diarsipkan.
- [x] Availability bisa toggle.
- [x] Gambar produk tampil di public catalog.

---

## Milestone 10 - Admin Order Forms

Halaman terkait:

- `/admin/dashboard/order-forms`

API yang dipakai:

- `GET /admin/order-forms`
- `POST /admin/order-forms`
- `PUT /admin/order-forms/:id`
- `PATCH /admin/order-forms/:id/status`
- `DELETE /admin/order-forms/:id`

Task:

- [x] Ganti list order forms ke API.
- [x] Ganti create form ke API.
- [x] Ganti edit form ke API.
- [x] Ganti toggle active ke API.
- [x] Ganti delete ke API.
- [x] Pastikan share link tetap benar.

Checklist:

- [x] Create form baru.
- [x] Buka `/form/[slug]`.
- [x] Toggle inactive membuat form tidak bisa diakses public.

---

## Milestone 11 - Admin Orders

Halaman terkait:

- `/admin/dashboard/orders`
- dashboard order list
- export button
- invoice buttons

API yang dipakai:

- `GET /admin/orders`
- `GET /admin/orders/:id`
- `PATCH /admin/orders/:id`
- `PATCH /admin/orders/:id/status`
- `PATCH /admin/orders/:id/amount`
- `POST /admin/orders/:id/receipt`
- `DELETE /admin/orders/:id/receipt`
- `GET /admin/orders/export`
- `POST /admin/orders/:id/send-invoice/whatsapp`
- `POST /admin/orders/:id/send-invoice/email`
- `POST /admin/orders/:id/send-confirmation-email`

Task:

- [x] Ganti list orders ke API.
- [x] Ganti filter tanggal/status/search ke query API.
- [x] Ganti update status ke API.
- [x] Ganti update amount/delivery fee ke API.
- [x] Ganti upload receipt ke API.
- [x] Ganti export XLSX ke API.
- [x] Ganti tombol kirim invoice WhatsApp ke API.
- [x] Ganti tombol kirim invoice email ke API.

Checklist:

- [x] Order list tampil.
- [x] Filter tanggal jalan.
- [x] Filter status jalan.
- [x] Update status berhasil.
- [x] Update amount berhasil.
- [x] Receipt upload berhasil.
- [x] Export download berhasil.
- [x] Invoice WA/email memberi pesan sukses/gagal.

---

## Milestone 12 - Admin Dashboard dan Analytics

Halaman terkait:

- `/admin/dashboard`

API yang dipakai:

- `GET /admin/dashboard`
- `GET /admin/analytics/summary`
- `GET /admin/analytics/revenue`
- `GET /admin/analytics/status-breakdown`
- `GET /admin/analytics/top-products`
- `GET /admin/analytics/delivery`

Task:

- [x] Ganti dashboard summary ke API.
- [x] Ganti pending order list ke API.
- [x] Ganti revenue chart ke API.
- [x] Ganti top products ke API.
- [x] Ganti status breakdown ke API.
- [x] Ganti delivery breakdown ke API.

Checklist:

- [x] Angka summary tampil.
- [x] Chart tampil.
- [x] Filter tanggal dashboard jalan.
- [x] Pending orders tampil.

---

## Milestone 13 - WhatsApp Admin

Halaman terkait:

- `/admin/dashboard/whatsapp`

API yang dipakai:

- `GET /admin/whatsapp/status`
- `GET /admin/whatsapp/qr`
- `POST /admin/whatsapp/logout`

Task:

- [x] Ganti status WhatsApp ke API backend.
- [x] Ganti QR state ke API backend.
- [x] Ganti logout WhatsApp ke API backend.
- [x] Jangan panggil WhatsApp gateway langsung dari frontend.

Checklist:

- [x] Status WA tampil.
- [x] QR tampil saat belum connect.
- [x] Logout WA berhasil.

---

## Milestone 14 - Hapus Supabase dari Frontend

Task:

- [x] Cari semua import Supabase (`rg "supabase|@supabase" src` -> 0 matches).
- [x] Hapus penggunaan Supabase client dari halaman public.
- [x] Hapus penggunaan Supabase client dari halaman admin.
- [x] Hapus env Supabase public jika sudah tidak dipakai.
- [x] Hapus dependency Supabase frontend (`@supabase/ssr`, `@supabase/supabase-js`).

---

## Milestone 15 - QA Manual Full Flow

Checklist:

- [x] Home tampil.
- [x] Catalog tampil.
- [x] Product detail tampil.
- [x] Add to cart.
- [x] Checkout order.
- [x] Order form default.
- [x] Custom form slug.
- [x] Receipt tampil.
- [x] Admin login.
- [x] Admin category CRUD.
- [x] Admin addon CRUD.
- [x] Admin product CRUD.
- [x] Admin order list.
- [x] Admin update order.
- [x] Admin export.
- [x] Admin dashboard.
- [x] Admin WhatsApp.
- [x] Logout admin.

---

## Definition of Done

Satu modul dianggap selesai kalau:

- [x] Tidak ada query Supabase langsung di modul tersebut.
- [x] Data tampil dari backend API.
- [x] Loading state ada.
- [x] Error state ada.
- [x] Create/update/delete berhasil jika modul admin.
- [x] Sudah dites manual lewat browser.
- [x] Tidak ada error di console browser.
