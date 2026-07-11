# Issue Planning: Ubah Checkbox Create Addons Menjadi Toggle

## Latar Belakang

Pada form create addons, beberapa opsi boolean seperti `is_active` dan `is_dark_color` masih menggunakan checkbox. Secara fungsi sudah cukup, tetapi dari sisi UI/UX kurang terasa modern dan kurang jelas untuk setting yang sifatnya on/off.

Perlu dilakukan perapihan tampilan dengan mengganti checkbox menjadi toggle/switch agar lebih mudah dipahami admin dan lebih konsisten sebagai kontrol binary setting.

## Tujuan

- Mengganti checkbox boolean pada form create/edit addons menjadi toggle.
- Membuat tampilan create addons lebih rapi, jelas, dan nyaman digunakan.
- Menjaga UI tetap konsisten dengan gaya admin dashboard.
- Meningkatkan visual hierarchy pada form addons.

## Scope

### 1. Ganti Checkbox Menjadi Toggle

Ganti input checkbox berikut menjadi toggle/switch:

- `is_active`
- `is_dark_color`

Area yang perlu dicek:

- Form create global addons.
- Form edit global addons.
- Form tambah addon baru dari halaman product, jika ada.

### 2. Desain Toggle

Toggle harus jelas menunjukkan status:

- On: aktif/enable.
- Off: nonaktif/disable.

Rekomendasi tampilan:

- Gunakan switch horizontal.
- Gunakan warna aktif yang sesuai dengan brand/admin UI.
- Tambahkan label yang singkat dan jelas.
- Tambahkan helper text kecil jika setting butuh konteks.

Contoh label:

```text
Aktif
Tampilkan addon ini ke user
```

```text
Warna Gelap
Aktifkan surcharge warna gelap
```

### 3. Layout Form Addons

Rapikan layout form supaya field boolean tidak terasa seperti input biasa.

Rekomendasi:

- Kelompokkan toggle dalam section kecil.
- Gunakan spacing yang konsisten.
- Toggle tidak perlu terlalu besar.
- Hindari form terlihat penuh/berantakan di mobile.

Contoh struktur:

```text
Nama Addon
Category
Additional Price

Settings
[toggle] Aktif
[toggle] Warna Gelap

Jika [toggle] Warna Gelap aktif:
Dark Color Surcharge
```

### 4. State dan Submit

Pastikan toggle tetap submit nilai yang sama seperti checkbox sebelumnya.

Behavior:

- Toggle on mengirim nilai `on` atau boolean `true`.
- Toggle off tidak mengirim nilai, atau dikonversi menjadi `false` di action.
- Existing action server tetap menerima `is_active` dan `is_dark_color`.

Jika menggunakan custom toggle, pastikan tetap ada hidden input atau state yang dikirim ke form.

### 5. Conditional Field Dark Color Surcharge

Field `dark_color_surcharge` hanya muncul ketika toggle `is_dark_color` aktif.

Behavior:

- Jika `is_dark_color = true`, tampilkan input `Dark Color Surcharge`.
- Jika `is_dark_color = false`, sembunyikan input `Dark Color Surcharge`.
- Saat toggle dimatikan, nilai `dark_color_surcharge` sebaiknya dikosongkan atau dikirim sebagai `0`.
- Saat edit addon lama yang punya `is_dark_color = true`, field `Dark Color Surcharge` langsung tampil.
- Saat edit addon lama yang punya `is_dark_color = false`, field `Dark Color Surcharge` tidak tampil.

### 6. Accessibility

Toggle harus tetap accessible.

Minimal:

- Bisa diklik dari label.
- Bisa digunakan dengan keyboard.
- Memiliki `aria-label` atau label visible.
- State checked jelas untuk screen reader.

## Acceptance Criteria

- Checkbox `is_active` diganti menjadi toggle.
- Checkbox `is_dark_color` diganti menjadi toggle.
- Toggle bekerja di create addon.
- Toggle bekerja di edit addon.
- Toggle bekerja di tambah addon dari halaman product jika form tersebut memiliki checkbox.
- Field `dark_color_surcharge` hanya tampil ketika toggle `is_dark_color` aktif.
- Saat toggle `is_dark_color` dimatikan, `dark_color_surcharge` tidak tersimpan sebagai nilai lama yang tidak sengaja terbawa.
- Nilai yang tersimpan ke database tetap benar.
- UI tetap rapi di mobile dan desktop.
- Build project berhasil.

## Catatan Desain

- Gunakan toggle untuk binary settings, bukan checkbox.
- Checkbox tetap cocok untuk multi-select list, misalnya memilih banyak addons sekaligus.
- Toggle harus terlihat seperti setting, bukan action button.
- Jangan membuat tampilan terlalu ramai dengan warna berlebihan.
- Prioritaskan spacing, label yang jelas, dan alignment yang rapi.

## Catatan Implementasi

- Jika project sudah punya komponen switch/toggle, gunakan komponen existing.
- Jika belum ada, buat komponen kecil reusable, misalnya `Switch.svelte`.
- Hindari menambah dependency baru hanya untuk switch.
- Pastikan style toggle selaras dengan komponen UI lain seperti `Button`, `Input`, dan `Card`.
