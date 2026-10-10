# Daftar menu admin untuk seeder BE

URL di bawah mengikuti route frontend yang berlaku. `icon` adalah nama icon Lucide yang didukung sidebar. Urutan disarankan sama dengan navigasi saat ini.

Frontend juga menerima URL pendek dari BE seperti `/admin/orders` atau `/admin/menus` dan mengarahkannya ke route `/admin/dashboard/...` yang sesuai. Untuk seeder baru, gunakan URL pada tabel agar tautan langsung menuju halaman frontend.

| displayOrder | name | url | icon |
|---:|---|---|---|
| 1 | Analytics | `/admin/dashboard` | `ChartBar` |
| 2 | Orders | `/admin/dashboard/orders` | `ShoppingCart` |
| 3 | Form Pembelian | `/admin/dashboard/order-forms` | `FileText` |
| 4 | Notifikasi | `/admin/dashboard/notifications` | `Bell` |
| 5 | Products | `/admin/dashboard/products` | `Package` |
| 6 | Categories | `/admin/dashboard/categories` | `Tags` |
| 7 | Addons | `/admin/dashboard/addons` | `ListPlus` |
| 8 | Banners | `/admin/dashboard/banners` | `Image` |
| 9 | Pengeluaran | `/admin/dashboard/expenses` | `Wallet` |
| 10 | Karyawan | `/admin/dashboard/employees` | `Users` |
| 11 | Role & Akses | `/admin/dashboard/roles` | `ShieldCheck` |
| 12 | Menu | `/admin/dashboard/menus` | `Menu` |
| 13 | Info Toko | `/admin/dashboard/site-info` | `Info` |
| 14 | WhatsApp | `/admin/dashboard/whatsapp` | `MessageCircle` |
| 15 | Log Aktivitas | `/admin/dashboard/logs` | `History` |

Set `isActive: true` untuk semua menu awal. Hubungkan menu ke role lewat relasi role-menu; menu akun biasa dikirim melalui `GET /auth/me` dan `POST /auth/login`. Role `super_admin` sebaiknya mendapatkan semua menu aktif. Menu **Menu** memerlukan permission `menu.manage` untuk API pengelolaannya.
