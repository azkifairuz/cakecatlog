# Rencana API Migrasi Supabase ke Bun

Dokumen ini merangkum API yang perlu dibuat ketika logic Supabase langsung dari SvelteKit dipindahkan ke backend Bun. Sumber analisa berasal dari route SvelteKit saat ini, terutama `+page.server.js`, endpoint `/api/*`, helper server, dan migration SQL di folder `supabase/`.

## Prinsip Umum

- Base path disarankan: `/api/v1`.
- Response JSON standar:

```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pesan error untuk user",
    "fields": {}
  }
}
```

- Admin endpoint wajib dilindungi auth middleware.
- Public endpoint hanya mengembalikan data aktif: `is_active = true`, dan untuk catalog customer juga `is_available = true`.
- Semua order wajib dihitung ulang di server berdasarkan data produk, varian, dan addon terbaru. Jangan percaya harga dari client.
- Upload file bisa memakai `multipart/form-data`. Jika nanti tidak memakai Supabase Storage, siapkan abstraction storage lokal/S3-compatible.
- Date dan waktu order saat ini mengikuti konteks Asia/Jakarta.

## Entitas Utama

Tabel atau konsep yang dipakai project sekarang:

- `products`
- `product_images`
- `product_variants`
- `categories`
- `global_addons`
- `product_addons`
- `orders`
- `order_items`
- `order_forms`
- `hero_banners`
- `site_contact_info`
- Supabase Auth session untuk admin
- Storage bucket saat ini: `products`, `banners`

## Matriks Endpoint Lengkap

Bagian ini adalah checklist cepat supaya scope migrasi tidak bias ke produk saja.

### Public

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/v1/home` | Data home: banner, kategori, catalog preview, top picks |
| `GET` | `/api/v1/home/products` | Produk home berdasarkan kategori |
| `GET` | `/api/v1/products` | Catalog produk public dengan pagination/filter |
| `GET` | `/api/v1/products/{id}` | Detail produk public |
| `GET` | `/api/v1/categories` | Kategori public |
| `GET` | `/api/v1/addons` | Addon public aktif |
| `GET` | `/api/v1/site-info` | Info toko public |
| `GET` | `/api/v1/order-form` | Data form order default |
| `GET` | `/api/v1/order-forms/{slug}` | Data custom order form public |
| `POST` | `/api/v1/orders` | Buat order single product dari form |
| `POST` | `/api/v1/orders/checkout` | Buat order dari cart checkout |
| `GET` | `/api/v1/orders/{id}/receipt` | Receipt order customer |

### Auth Admin

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `POST` | `/api/v1/auth/login` | Login admin |
| `GET` | `/api/v1/auth/me` | Cek sesi admin |
| `POST` | `/api/v1/auth/logout` | Logout admin |
| `POST` | `/api/v1/auth/refresh` | Refresh token atau session |

### Admin Dashboard dan Analytics

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/v1/admin/dashboard` | Dashboard summary + pending orders |
| `GET` | `/api/v1/admin/analytics/summary` | Ringkasan KPI order/revenue |
| `GET` | `/api/v1/admin/analytics/revenue` | Revenue time series |
| `GET` | `/api/v1/admin/analytics/status-breakdown` | Breakdown status order |
| `GET` | `/api/v1/admin/analytics/top-products` | Produk paling laku |
| `GET` | `/api/v1/admin/analytics/delivery` | Breakdown pickup/delivery |

### Admin Orders

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/v1/admin/orders` | List order admin |
| `GET` | `/api/v1/admin/orders/{id}` | Detail order admin |
| `PATCH` | `/api/v1/admin/orders/{id}` | Update field order umum |
| `PATCH` | `/api/v1/admin/orders/{id}/status` | Update status |
| `PATCH` | `/api/v1/admin/orders/{id}/amount` | Update amount/cake price/delivery fee |
| `POST` | `/api/v1/admin/orders/{id}/receipt` | Upload bukti transfer |
| `DELETE` | `/api/v1/admin/orders/{id}/receipt` | Hapus bukti transfer |
| `GET` | `/api/v1/admin/orders/export` | Export XLSX |
| `POST` | `/api/v1/admin/orders/{id}/send-invoice/whatsapp` | Kirim invoice WhatsApp |
| `POST` | `/api/v1/admin/orders/{id}/send-invoice/email` | Kirim invoice email |
| `POST` | `/api/v1/admin/orders/{id}/send-confirmation-email` | Kirim ulang email konfirmasi |

### Admin Products

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/v1/admin/products` | List produk admin |
| `GET` | `/api/v1/admin/products/{id}` | Detail produk admin |
| `POST` | `/api/v1/admin/products` | Create produk |
| `PUT` | `/api/v1/admin/products/{id}` | Edit produk |
| `DELETE` | `/api/v1/admin/products/{id}` | Archive produk |
| `PATCH` | `/api/v1/admin/products/{id}/availability` | Toggle available |
| `POST` | `/api/v1/admin/products/{id}/images` | Upload gambar produk |
| `PATCH` | `/api/v1/admin/products/{id}/images/{imageId}/primary` | Set primary image |
| `DELETE` | `/api/v1/admin/products/{id}/images/{imageId}` | Hapus gambar produk |
| `PUT` | `/api/v1/admin/products/{id}/variants` | Replace/sync varian produk |
| `PUT` | `/api/v1/admin/products/{id}/addons` | Replace/sync addon produk |

### Admin Master Data

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/v1/admin/categories` | List kategori |
| `POST` | `/api/v1/admin/categories` | Create kategori |
| `PUT` | `/api/v1/admin/categories/{id}` | Edit kategori |
| `DELETE` | `/api/v1/admin/categories/{id}` | Delete kategori |
| `GET` | `/api/v1/admin/categories/{slug}` | Detail kategori + produk |
| `GET` | `/api/v1/admin/addons` | List addons |
| `POST` | `/api/v1/admin/addons` | Create addon |
| `PUT` | `/api/v1/admin/addons/{id}` | Edit addon |
| `PATCH` | `/api/v1/admin/addons/{id}/toggle` | Toggle addon aktif |
| `DELETE` | `/api/v1/admin/addons/{id}` | Delete addon |
| `GET` | `/api/v1/admin/banners` | List banner |
| `POST` | `/api/v1/admin/banners` | Upload/create banner |
| `PUT` | `/api/v1/admin/banners/{id}` | Edit banner |
| `PUT` | `/api/v1/admin/banners/bulk` | Bulk reorder/toggle banner |
| `DELETE` | `/api/v1/admin/banners/{id}` | Delete banner |
| `GET` | `/api/v1/admin/site-info` | Get site info |
| `PUT` | `/api/v1/admin/site-info` | Update site info |
| `GET` | `/api/v1/admin/order-forms` | List generated order forms |
| `POST` | `/api/v1/admin/order-forms` | Create order form |
| `PUT` | `/api/v1/admin/order-forms/{id}` | Edit order form |
| `PATCH` | `/api/v1/admin/order-forms/{id}/status` | Toggle order form aktif |
| `DELETE` | `/api/v1/admin/order-forms/{id}` | Delete order form |

### Admin WhatsApp dan Upload

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/v1/admin/whatsapp/status` | Status WhatsApp gateway |
| `GET` | `/api/v1/admin/whatsapp/qr` | QR login WhatsApp |
| `POST` | `/api/v1/admin/whatsapp/logout` | Logout WhatsApp |
| `POST` | `/api/v1/uploads/reference-image` | Upload reference image public/order |
| `POST` | `/api/v1/admin/uploads/product-image` | Upload image admin |
| `DELETE` | `/api/v1/admin/uploads` | Delete uploaded file |

## Model Ringkas

### Product

```json
{
  "id": "uuid",
  "name": "Mini Cake",
  "description": "string",
  "base_price": 120000,
  "handling_warning": "string|null",
  "is_active": true,
  "is_available": true,
  "category_id": "uuid|null",
  "category": { "id": "uuid", "name": "Birthday", "slug": "birthday" },
  "images": [
    { "id": "uuid", "image_url": "https://...", "is_primary": true }
  ],
  "variants": [
    { "id": "uuid", "name": "10cm", "price": 120000, "is_active": true, "display_order": 0 }
  ],
  "addons": [
    {
      "id": "uuid",
      "category": "Flavor",
      "category_key": "flavor",
      "name": "Chocolate",
      "additional_price": 10000,
      "is_dark_color": false,
      "dark_color_surcharge": 0,
      "is_active": true
    }
  ],
  "created_at": "2026-09-20T00:00:00.000Z"
}
```

### Order

```json
{
  "id": "uuid",
  "order_number": 1001,
  "customer_name": "Nama Customer",
  "email": "customer@example.com",
  "phone_number": "6281234567890",
  "delivery_option": "delivery",
  "address": "Alamat customer",
  "delivery_date": "2026-09-25",
  "delivery_time": "10:00",
  "status": "Pending",
  "amount": 250000,
  "cake_price": 220000,
  "delivery_fee": 30000,
  "delivery_vehicle": "motor",
  "proof_of_transfer": "https://...",
  "items": [],
  "created_at": "2026-09-20T00:00:00.000Z"
}
```

Status order yang dipakai:

```json
["Pending", "Diproses", "Selesai", "Batal/Refund"]
```

## Public API

### 1. Home Data

Digunakan oleh halaman `/`.

`GET /api/v1/home`

Query: tidak ada.

Response:

```json
{
  "success": true,
  "data": {
    "banners": [
      { "id": "uuid", "image_url": "https://...", "display_order": 1 }
    ],
    "catalog": {
      "categories": [
        { "id": "uuid", "name": "Birthday", "slug": "birthday" }
      ],
      "products": []
    },
    "topPicks": []
  }
}
```

Catatan:

- `products` limit 8.
- `topPicks` limit 6.
- `banners` hanya yang aktif, urut `display_order`.
- `topPicks` saat ini dari view/table `top_selling_products`.

### 2. Home Products per Category

Pengganti endpoint sekarang `src/routes/api/home-products/+server.js`.

`GET /api/v1/home/products?category={slug}`

Response:

```json
{
  "success": true,
  "data": {
    "products": []
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "CATEGORY_REQUIRED",
    "message": "Category is required."
  }
}
```

### 3. Catalog Produk

Digunakan oleh `/catalog`.

`GET /api/v1/products`

Query:

| Nama | Tipe | Wajib | Default | Catatan |
| --- | --- | --- | --- | --- |
| `page` | number | tidak | `1` | pagination |
| `pageSize` | number | tidak | `6` | current UI pakai 6 |
| `category` | string | tidak | `All` | slug kategori |
| `q` | string | tidak | - | opsional untuk search publik |

Response:

```json
{
  "success": true,
  "data": {
    "products": [],
    "categories": [],
    "selectedCategory": "All",
    "pagination": {
      "page": 1,
      "pageSize": 6,
      "totalProducts": 20,
      "totalPages": 4,
      "from": 1,
      "to": 6
    }
  }
}
```

### 4. Detail Produk

Digunakan oleh `/product/[id]`.

`GET /api/v1/products/{id}`

Response:

```json
{
  "success": true,
  "data": {
    "product": {}
  }
}
```

Error 404:

```json
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product not found"
  }
}
```

### 5. Categories Publik

`GET /api/v1/categories`

Response:

```json
{
  "success": true,
  "data": {
    "categories": [
      { "id": "uuid", "name": "Birthday", "slug": "birthday" }
    ]
  }
}
```

### 6. Global Addons Publik

`GET /api/v1/addons`

Query:

| Nama | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `activeOnly` | boolean | tidak | default `true` untuk public |

Response:

```json
{
  "success": true,
  "data": {
    "addons": []
  }
}
```

### 7. Site Info

Dipakai layout, checkout, form order, receipt, dan WhatsApp FAB.

`GET /api/v1/site-info`

Response:

```json
{
  "success": true,
  "data": {
    "siteInfo": {
      "id": "main",
      "pickup_days": "MONDAY - SUNDAY",
      "pickup_store_hours": "Store Hours: 09:00 - 18:00",
      "pickup_manager_hours": "Manager Hours: 09:00 - 20:00",
      "address": "Alamat toko",
      "whatsapp_number": "6285883749714"
    }
  }
}
```

### 8. Order Form Landing Data

Digunakan oleh `/order-form` dan `/form/[slug]`.

`GET /api/v1/order-form`

Query:

| Nama | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `product` | string | tidak | id produk atau nama produk untuk preselect |

Response:

```json
{
  "success": true,
  "data": {
    "products": [],
    "globalAddons": [],
    "siteInfo": {},
    "initialProductId": "uuid|null"
  }
}
```

`GET /api/v1/order-forms/{slug}`

Response:

```json
{
  "success": true,
  "data": {
    "customForm": {
      "id": "uuid",
      "title": "Form Birthday Cake",
      "slug": "birthday-cake",
      "product_id": "uuid|null",
      "description": "string|null",
      "banner_text": "string|null",
      "views_count": 12,
      "orders_count": 3
    },
    "products": [],
    "globalAddons": [],
    "siteInfo": {},
    "initialProductId": "uuid|null",
    "bannerText": "Form Birthday Cake"
  }
}
```

Catatan:

- Jika slug tidak ada di `order_forms`, project sekarang fallback mencari produk berdasarkan `id` atau slug dari nama produk.
- Saat form ditemukan, `views_count` dinaikkan.

### 9. Buat Order dari Checkout Cart

Digunakan oleh `/checkout`.

`POST /api/v1/orders/checkout`

Content type: `application/json`

Request:

```json
{
  "locale": "id",
  "customer_name": "Nama Customer",
  "email": "customer@example.com",
  "phone_number": "081234567890",
  "phone_country": "ID",
  "delivery_option": "delivery",
  "address": "Alamat customer",
  "delivery_date": "2026-09-25",
  "delivery_time": "10:00",
  "total_price": 250000,
  "cart_items": [
    {
      "product_id": "uuid",
      "product_variant_id": "uuid|null",
      "quantity": 2,
      "cake_text": "Happy Birthday",
      "gift_card_text": "string|null",
      "reference_image_url": "https://...|null",
      "customized_options": {
        "size": { "variant_id": "uuid|null", "addon_id": "uuid|null" },
        "addons": [
          { "addon_id": "uuid" }
        ]
      }
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "uuid"
  }
}
```

Validasi penting:

- Email valid.
- Nomor WhatsApp dinormalisasi.
- `delivery_option` harus `pickup` atau `delivery`.
- Jika `delivery`, `address` dan `delivery_time` wajib.
- Cart tidak boleh kosong.
- Server melakukan repricing semua item.
- Jika `total_price` client berbeda dari hasil repricing server, return error.
- Insert ke `orders` dan `order_items`.
- Kirim order confirmation email setelah order tersimpan.

### 10. Buat Order Satuan dari Form

Digunakan oleh `/order-form` dan `/form/[slug]`.

`POST /api/v1/orders`

Content type: `multipart/form-data`, karena mendukung upload `reference_image`.

Request fields:

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `locale` | string | tidak | `id` atau `en` |
| `form_slug` | string | tidak | isi jika order dari `/form/[slug]` |
| `product_id` | uuid | ya | produk dipesan |
| `product_variant_id` | uuid | tidak | varian ukuran |
| `customer_name` | string | ya | nama pemesan |
| `email` | string | ya | email valid |
| `phone_number` | string | ya | nomor WhatsApp |
| `phone_country` | string | tidak | default `ID` |
| `delivery_option` | string | ya | `pickup` atau `delivery` |
| `address` | string | wajib jika delivery | alamat |
| `delivery_date` | date | ya | format `YYYY-MM-DD` |
| `delivery_time` | string | wajib jika delivery | jam kirim |
| `quantity` | number | tidak | default `1` |
| `cake_size` | string | tidak | fallback legacy |
| `cake_text` | string | tidak | tulisan di kue |
| `gift_card_text` | string | tidak | kartu ucapan |
| `customized_options` | JSON string | tidak | pilihan size dan addon |
| `addon_*` | uuid | tidak | fallback field addon |
| `reference_image` | file | tidak | upload referensi customer |

Contoh `customized_options`:

```json
{
  "size": {
    "variant_id": "uuid"
  },
  "addons": [
    { "addon_id": "uuid" }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "uuid"
  }
}
```

Catatan:

- Server fetch produk live dan addon live.
- Server hitung `size_price`, `dark_color_surcharge`, `cake_topper_fee`, `estimated_unit_price`, `estimated_subtotal`.
- Jika `form_slug` ada, increment `orders_count`.
- Jika upload referensi gagal, project saat ini tetap lanjut tanpa image.

### 11. Receipt Order

Digunakan oleh `/order/receipt/[id]`.

`GET /api/v1/orders/{id}/receipt`

Response:

```json
{
  "success": true,
  "data": {
    "order": {},
    "siteInfo": {}
  }
}
```

## Auth API

### 12. Admin Login

Pengganti Supabase Auth `signInWithPassword`.

`POST /api/v1/auth/login`

Request:

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "role": "admin"
    },
    "accessToken": "jwt",
    "refreshToken": "jwt-or-token"
  }
}
```

Catatan:

- Jika memakai httpOnly cookie, token tidak perlu dikembalikan di body.
- Middleware admin membaca cookie/session untuk semua endpoint `/api/v1/admin/*`.

### 13. Admin Me

`GET /api/v1/auth/me`

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

### 14. Admin Logout

`POST /api/v1/auth/logout`

Response:

```json
{
  "success": true,
  "message": "Logged out"
}
```

### 14A. Refresh Session

`POST /api/v1/auth/refresh`

Request:

```json
{
  "refreshToken": "token-jika-tidak-pakai-cookie"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-baru",
    "refreshToken": "refresh-token-baru"
  }
}
```

Catatan:

- Jika memakai httpOnly cookie, body bisa kosong dan backend membaca refresh token dari cookie.
- Endpoint ini penting supaya admin dashboard tidak sering logout ketika migrasi dari Supabase Auth.

## Admin API

Semua endpoint di bagian ini membutuhkan admin auth.

Header jika memakai bearer token:

```http
Authorization: Bearer <accessToken>
```

### 15. Dashboard Summary

Digunakan oleh `/admin/dashboard`.

`GET /api/v1/admin/dashboard`

Query:

| Nama | Tipe | Default | Catatan |
| --- | --- | --- | --- |
| `q` | string | - | search nama, email, order number |
| `status` | string | `All` | status order |
| `date_type` | string | `delivery_date` | `delivery_date` atau `created_at` |
| `start` | date | hari ini | rentang awal |
| `end` | date | hari ini | rentang akhir |
| `page` | number | `1` | pagination pending order |

Response:

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSales": 10,
      "pending": 2,
      "processing": 3,
      "completed": 5,
      "totalRevenue": 1200000
    },
    "orders": [],
    "filters": {},
    "pagination": {}
  }
}
```

### 15A. Analytics Summary

Endpoint ini dibuat khusus agar analytics dashboard tidak bercampur dengan list order.

`GET /api/v1/admin/analytics/summary`

Query:

| Nama | Tipe | Default | Catatan |
| --- | --- | --- | --- |
| `date_type` | string | `delivery_date` | `delivery_date` atau `created_at` |
| `start` | date | hari ini | format `YYYY-MM-DD` |
| `end` | date | hari ini | format `YYYY-MM-DD` |

Response:

```json
{
  "success": true,
  "data": {
    "totalOrders": 25,
    "pendingOrders": 4,
    "processingOrders": 6,
    "completedOrders": 13,
    "cancelledOrders": 2,
    "grossRevenue": 3500000,
    "completedRevenue": 2800000,
    "averageOrderValue": 140000
  }
}
```

### 15B. Analytics Revenue Time Series

`GET /api/v1/admin/analytics/revenue`

Query:

| Nama | Tipe | Default | Catatan |
| --- | --- | --- | --- |
| `start` | date | 30 hari terakhir | format `YYYY-MM-DD` |
| `end` | date | hari ini | format `YYYY-MM-DD` |
| `groupBy` | string | `day` | `day`, `week`, atau `month` |
| `status` | string | `Selesai` | bisa `All` |

Response:

```json
{
  "success": true,
  "data": {
    "series": [
      {
        "period": "2026-09-20",
        "orders": 5,
        "revenue": 750000
      }
    ]
  }
}
```

### 15C. Analytics Status Breakdown

`GET /api/v1/admin/analytics/status-breakdown`

Query sama dengan analytics summary.

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      { "status": "Pending", "count": 4, "amount": 500000 },
      { "status": "Diproses", "count": 6, "amount": 900000 },
      { "status": "Selesai", "count": 13, "amount": 2800000 },
      { "status": "Batal/Refund", "count": 2, "amount": 300000 }
    ]
  }
}
```

### 15D. Analytics Top Products

`GET /api/v1/admin/analytics/top-products`

Query:

| Nama | Tipe | Default |
| --- | --- | --- |
| `start` | date | 30 hari terakhir |
| `end` | date | hari ini |
| `limit` | number | `10` |

Response:

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "product_id": "uuid",
        "name": "Mini Cake",
        "quantity": 18,
        "orders": 12,
        "revenue": 2160000
      }
    ]
  }
}
```

### 15E. Analytics Delivery Breakdown

`GET /api/v1/admin/analytics/delivery`

Query sama dengan analytics summary.

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      { "delivery_option": "pickup", "count": 8, "amount": 900000 },
      { "delivery_option": "delivery", "count": 17, "amount": 2600000 }
    ]
  }
}
```

### 16. Admin List Orders

Digunakan oleh `/admin/dashboard/orders`.

`GET /api/v1/admin/orders`

Query:

| Nama | Tipe | Default |
| --- | --- | --- |
| `q` | string | - |
| `status` | string | `All` |
| `date_type` | string | `delivery_date` |
| `date` | date | hari ini |
| `page` | number | `1` |
| `pageSize` | number | `24` |

Response:

```json
{
  "success": true,
  "data": {
    "orders": [],
    "filters": {},
    "pagination": {
      "page": 1,
      "pageSize": 24,
      "totalItems": 100,
      "totalPages": 5,
      "from": 1,
      "to": 24
    }
  }
}
```

### 16A. Admin Detail Order

`GET /api/v1/admin/orders/{id}`

Response:

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "order_number": 1001,
      "customer_name": "Nama Customer",
      "email": "customer@example.com",
      "phone_number": "6281234567890",
      "delivery_option": "delivery",
      "delivery_date": "2026-09-25",
      "delivery_time": "10:00",
      "address": "Alamat",
      "status": "Pending",
      "amount": 250000,
      "products": { "name": "Mini Cake" },
      "order_items": []
    }
  }
}
```

### 16B. Admin Update Order Umum

Untuk edit data order selain status dan amount.

`PATCH /api/v1/admin/orders/{id}`

Request:

```json
{
  "customer_name": "Nama Baru",
  "email": "customer@example.com",
  "phone_number": "6281234567890",
  "delivery_option": "delivery",
  "address": "Alamat baru",
  "delivery_date": "2026-09-25",
  "delivery_time": "10:00",
  "cake_text": "Happy Birthday",
  "gift_card_text": "string|null"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "order": {}
  }
}
```

### 17. Update Status Order

`PATCH /api/v1/admin/orders/{id}/status`

Request:

```json
{
  "status": "Diproses"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "Diproses"
  }
}
```

### 18. Update Amount dan Delivery Fee Order

`PATCH /api/v1/admin/orders/{id}/amount`

Request:

```json
{
  "amount": 250000,
  "cake_price": 220000,
  "delivery_fee": 30000,
  "delivery_vehicle": "motor"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amount": 250000,
    "cake_price": 220000,
    "delivery_fee": 30000,
    "delivery_vehicle": "motor"
  }
}
```

### 19. Upload Bukti Transfer

`POST /api/v1/admin/orders/{id}/receipt`

Content type: `multipart/form-data`

Request fields:

| Field | Tipe | Wajib |
| --- | --- | --- |
| `receipt` | file | ya |

Response:

```json
{
  "success": true,
  "data": {
    "proof_of_transfer": "https://..."
  }
}
```

### 20. Export Orders XLSX

Pengganti `src/routes/admin/dashboard/orders/export/+server.js`.

`GET /api/v1/admin/orders/export`

Query sama dengan list order, plus:

| Nama | Tipe | Catatan |
| --- | --- | --- |
| `scope` | string | `dashboard` untuk rentang start/end |

Response:

- Content type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Header: `Content-Disposition: attachment; filename="Daftar_Pesanan_{range}.xlsx"`

### 20A. Hapus Bukti Transfer

`DELETE /api/v1/admin/orders/{id}/receipt`

Response:

```json
{
  "success": true,
  "data": {
    "proof_of_transfer": null
  }
}
```

Catatan:

- Hapus file dari storage jika path dapat dikenali.
- Set `orders.proof_of_transfer = null`.

### 21. Kirim Invoice WhatsApp

Pengganti `/api/send-invoice`.

`POST /api/v1/admin/orders/{id}/send-invoice/whatsapp`

Request:

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Invoice berhasil dikirim ke WhatsApp pelanggan."
}
```

Error yang perlu dipetakan:

- `NOT_CONNECTED`
- `INVALID_RECIPIENT`
- `RECIPIENT_NOT_REGISTERED`
- `RECIPIENT_LOOKUP_FAILED`
- `DELIVERY_FAILED`
- `DELIVERY_TIMEOUT`
- `GATEWAY_TIMEOUT`
- `RATE_LIMIT_EXCEEDED`
- `CONFIGURATION_ERROR`

### 22. Kirim Invoice Email

Pengganti `/api/send-invoice-email`.

`POST /api/v1/admin/orders/{id}/send-invoice/email`

Request:

```json
{}
```

Response:

```json
{
  "success": true,
  "message": "Invoice berhasil dikirim ke email pelanggan."
}
```

### 23. Kirim Ulang Email Konfirmasi Order

Pengganti `/api/send-order-confirmation-email`.

`POST /api/v1/admin/orders/{id}/send-confirmation-email`

Response:

```json
{
  "success": true,
  "message": "Email konfirmasi berhasil dikirim."
}
```

### 24. Admin List Products

Digunakan oleh `/admin/dashboard/products`.

`GET /api/v1/admin/products`

Query:

| Nama | Tipe | Default |
| --- | --- | --- |
| `page` | number | `1` |
| `pageSize` | number | `10` |
| `q` | string | - |
| `category` | uuid[] | - |

Response:

```json
{
  "success": true,
  "data": {
    "products": [],
    "categories": [],
    "globalAddons": [],
    "filters": {
      "search": "",
      "categories": []
    },
    "pagination": {}
  }
}
```

### 24A. Admin Detail Product

`GET /api/v1/admin/products/{id}`

Response:

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "uuid",
      "name": "Mini Cake",
      "description": "string",
      "base_price": 120000,
      "handling_warning": "string|null",
      "is_active": true,
      "is_available": true,
      "category": {
        "id": "uuid",
        "name": "Birthday",
        "slug": "birthday"
      },
      "product_images": [],
      "product_variants": [],
      "product_addons": []
    },
    "categories": [],
    "globalAddons": []
  }
}
```

### 25. Create Product

`POST /api/v1/admin/products`

Content type: `multipart/form-data`

Request fields:

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `name` | string | ya | nama produk |
| `description` | string | tidak | deskripsi |
| `base_price` | number/string | ya | akan diparse server |
| `is_available` | boolean | tidak | default false jika kosong |
| `category_id` | uuid | tidak | kategori |
| `handling_warning` | string | tidak | warning handling |
| `product_variants` | JSON string | tidak | array varian |
| `product_addons` | JSON string | tidak | relasi addon aktif/nonaktif |
| `new_addons` | JSON string | tidak | buat global addon baru lalu attach ke produk |
| `primary_image_key` | string | tidak | `existing:{id}` atau `new:{index}` |
| `images` | file[] | tidak | gambar produk |

Contoh `product_variants`:

```json
[
  { "name": "10cm", "price": 120000, "is_active": true, "display_order": 0 },
  { "name": "12cm", "price": 150000, "is_active": true, "display_order": 1 }
]
```

Contoh `product_addons`:

```json
[
  { "addon_id": "uuid", "is_active": true }
]
```

Response:

```json
{
  "success": true,
  "data": {
    "product": {}
  }
}
```

### 26. Update Product

`PUT /api/v1/admin/products/{id}`

Content type: `multipart/form-data`

Request fields sama dengan create, plus:

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `deleted_image_ids` | string | tidak | comma separated id gambar yang dihapus |

Response:

```json
{
  "success": true,
  "data": {
    "product": {}
  }
}
```

### 27. Archive Product

Project sekarang tidak hard delete produk dari UI, hanya `is_active = false`.

`DELETE /api/v1/admin/products/{id}`

Response:

```json
{
  "success": true,
  "data": {
    "archived": true
  }
}
```

### 28. Toggle Product Availability

`PATCH /api/v1/admin/products/{id}/availability`

Request:

```json
{
  "is_available": false
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_available": true
  }
}
```

Catatan: request mengirim state saat ini, response mengembalikan state baru.

### 28A. Upload Product Images

Endpoint ini berguna jika UI admin nanti ingin upload gambar secara terpisah dari form create/update produk.

`POST /api/v1/admin/products/{id}/images`

Content type: `multipart/form-data`

Request fields:

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `images` | file[] | ya | satu atau banyak gambar |
| `primary_image_key` | string | tidak | contoh `new:0` |

Response:

```json
{
  "success": true,
  "data": {
    "images": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "image_url": "https://...",
        "is_primary": true
      }
    ]
  }
}
```

### 28B. Set Primary Product Image

`PATCH /api/v1/admin/products/{id}/images/{imageId}/primary`

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "primaryImageId": "uuid"
  }
}
```

Catatan:

- Set semua image produk menjadi `is_primary = false`.
- Set image terpilih menjadi `is_primary = true`.

### 28C. Delete Product Image

`DELETE /api/v1/admin/products/{id}/images/{imageId}`

Response:

```json
{
  "success": true
}
```

Catatan:

- Hapus row `product_images`.
- Hapus file dari storage jika path bisa diekstrak dari URL.
- Jika gambar primary dihapus, jadikan gambar tertua berikutnya sebagai primary.

### 28D. Sync Product Variants

Endpoint dedicated untuk replace/sync semua varian produk.

`PUT /api/v1/admin/products/{id}/variants`

Request:

```json
{
  "variants": [
    {
      "id": "uuid|null",
      "name": "10cm",
      "price": 120000,
      "is_active": true,
      "display_order": 0
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "variants": []
  }
}
```

Catatan:

- Varian yang tidak dikirim akan dihapus, sesuai logic `syncProductVariants` sekarang.
- Varian dengan `id` di-upsert.
- Varian tanpa `id` dibuat baru.

### 28E. Sync Product Addons

Endpoint dedicated untuk replace/sync relasi addon produk.

`PUT /api/v1/admin/products/{id}/addons`

Request:

```json
{
  "addons": [
    {
      "addon_id": "uuid",
      "is_active": true
    }
  ],
  "new_addons": [
    {
      "category": "Flavor",
      "name": "Chocolate",
      "additional_price": 10000,
      "is_dark_color": false,
      "dark_color_surcharge": 0,
      "is_active": true
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "product_addons": [],
    "created_addons": []
  }
}
```

Catatan:

- Relasi `product_addons` yang tidak dikirim akan dihapus.
- `new_addons` dibuat ke `global_addons`, lalu otomatis dihubungkan ke produk.

### 29. Admin Categories

`GET /api/v1/admin/categories`

Response:

```json
{
  "success": true,
  "data": {
    "categories": []
  }
}
```

`POST /api/v1/admin/categories`

Request:

```json
{
  "name": "Birthday"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Birthday",
      "slug": "birthday"
    }
  }
}
```

`DELETE /api/v1/admin/categories/{id}`

Response:

```json
{
  "success": true
}
```

`PUT /api/v1/admin/categories/{id}`

Request:

```json
{
  "name": "Birthday Cake",
  "slug": "birthday-cake"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Birthday Cake",
      "slug": "birthday-cake"
    }
  }
}
```

Catatan:

- Jika `slug` kosong, generate dari `name`.
- Validasi unique `name` dan `slug`.

### 30. Admin Category Detail Products

Digunakan oleh `/admin/dashboard/categories/[slug]`.

`GET /api/v1/admin/categories/{slug}`

Response:

```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Birthday",
      "slug": "birthday"
    },
    "products": []
  }
}
```

### 31. Admin Addons

`GET /api/v1/admin/addons`

Response:

```json
{
  "success": true,
  "data": {
    "addons": []
  }
}
```

`POST /api/v1/admin/addons`

Request:

```json
{
  "category": "Flavor",
  "name": "Chocolate",
  "additional_price": 10000,
  "is_dark_color": false,
  "dark_color_surcharge": 0,
  "is_active": true
}
```

`PUT /api/v1/admin/addons/{id}`

Request sama dengan create.

`PATCH /api/v1/admin/addons/{id}/toggle`

Request:

```json
{
  "is_active": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_active": false
  }
}
```

`DELETE /api/v1/admin/addons/{id}`

Response:

```json
{
  "success": true
}
```

### 32. Admin Banners

`GET /api/v1/admin/banners`

Response:

```json
{
  "success": true,
  "data": {
    "banners": []
  }
}
```

`POST /api/v1/admin/banners`

Content type: `multipart/form-data`

Request fields:

| Field | Tipe | Wajib |
| --- | --- | --- |
| `image` | file | ya |
| `is_active` | boolean | tidak |

Response:

```json
{
  "success": true,
  "message": "Banner berhasil ditambahkan.",
  "data": {
    "banner": {}
  }
}
```

Validasi banner:

- Maksimal 5 banner aktif.
- Saat update semua banner, minimal 2 dan maksimal 5 banner aktif.

`PUT /api/v1/admin/banners/{id}`

Request:

```json
{
  "display_order": 1,
  "is_active": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "banner": {
      "id": "uuid",
      "image_url": "https://...",
      "display_order": 1,
      "is_active": true
    }
  }
}
```

Catatan:

- Tetap validasi minimal 2 dan maksimal 5 banner aktif.
- Jika ingin ganti gambar banner, lebih sederhana gunakan delete lalu upload baru, atau tambahkan field `image` multipart di endpoint ini.

`PUT /api/v1/admin/banners/bulk`

Request:

```json
{
  "banners": [
    {
      "id": "uuid",
      "image_url": "https://...",
      "display_order": 1,
      "is_active": true
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "message": "Perubahan berhasil disimpan."
}
```

`DELETE /api/v1/admin/banners/{id}`

Request:

```json
{
  "image_url": "https://..."
}
```

Response:

```json
{
  "success": true,
  "message": "Banner berhasil dihapus."
}
```

### 33. Admin Site Info

`GET /api/v1/admin/site-info`

Response sama dengan public site info.

`PUT /api/v1/admin/site-info`

Request:

```json
{
  "pickup_days": "MONDAY - SUNDAY",
  "pickup_store_hours": "Store Hours: 09:00 - 18:00",
  "pickup_manager_hours": "Manager Hours: 09:00 - 20:00",
  "address": "Alamat toko",
  "whatsapp_number": "6285883749714"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "siteInfo": {}
  }
}
```

### 34. Admin Order Forms

`GET /api/v1/admin/order-forms`

Response:

```json
{
  "success": true,
  "data": {
    "products": [],
    "orderForms": [],
    "siteInfo": {}
  }
}
```

`POST /api/v1/admin/order-forms`

Request:

```json
{
  "title": "Form Birthday Cake",
  "slug": "birthday-cake",
  "product_id": "uuid|null",
  "description": "string|null",
  "banner_text": "string|null"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "form": {}
  }
}
```

`PUT /api/v1/admin/order-forms/{id}`

Request sama dengan create.

`PATCH /api/v1/admin/order-forms/{id}/status`

Request:

```json
{
  "is_active": true
}
```

Response:

```json
{
  "success": true
}
```

`DELETE /api/v1/admin/order-forms/{id}`

Response:

```json
{
  "success": true
}
```

### 35. WhatsApp Gateway Status

Pengganti `/admin/dashboard/whatsapp/status`.

`GET /api/v1/admin/whatsapp/status`

Response:

```json
{
  "status": "connected",
  "qr": null,
  "message": "Connected"
}
```

Error response:

```json
{
  "status": "error",
  "qr": null,
  "message": "Tidak dapat menghubungi WhatsApp gateway."
}
```

### 36. WhatsApp QR State

Digunakan halaman admin WhatsApp.

`GET /api/v1/admin/whatsapp/qr`

Response mengikuti gateway:

```json
{
  "status": "qr",
  "qr": "data:image/png;base64,...",
  "message": "Scan QR"
}
```

### 37. WhatsApp Logout

`POST /api/v1/admin/whatsapp/logout`

Response:

```json
{
  "success": true
}
```

## Upload API Opsional

Endpoint ini opsional jika upload tetap digabung dengan create/update product dan order.

### 38. Upload Reference Image

`POST /api/v1/uploads/reference-image`

Content type: `multipart/form-data`

Request:

| Field | Tipe | Wajib |
| --- | --- | --- |
| `file` | file | ya |

Response:

```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "path": "cust_reference/file.jpg"
  }
}
```

### 39. Upload Product Image

`POST /api/v1/admin/uploads/product-image`

Request:

| Field | Tipe | Wajib |
| --- | --- | --- |
| `file` | file | ya |

Response:

```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "path": "product/file.jpg"
  }
}
```

### 40. Delete Uploaded File

`DELETE /api/v1/admin/uploads`

Request:

```json
{
  "bucket": "products",
  "path": "product/file.jpg"
}
```

Response:

```json
{
  "success": true
}
```

## Endpoint Minimal Prioritas Migrasi

Jika migrasi dilakukan bertahap, urutan paling aman:

1. Auth admin: login, me, logout.
2. Public read API: home, products, product detail, categories, addons, site-info.
3. Order creation: checkout cart dan order form, termasuk repricing server-side.
4. Admin orders: list, dashboard, update status, update amount, upload receipt, export.
5. Admin products: list, create, update, archive, toggle availability.
6. Admin master data: categories, addons, banners, site info, order forms.
7. Integrasi notifikasi: email confirmation, invoice email, invoice WhatsApp, WhatsApp status/QR/logout.

## Catatan Implementasi Bun

Rekomendasi struktur backend:

```txt
src/
  index.ts
  db/
    client.ts
    schema.ts
  middleware/
    auth.ts
    error.ts
  modules/
    auth/
    catalog/
    products/
    orders/
    admin/
    uploads/
    notifications/
    whatsapp/
  utils/
    pricing.ts
    phone-number.ts
    pagination.ts
```

Library yang cocok:

- Runtime: Bun.
- HTTP framework: Elysia atau Hono.
- DB: PostgreSQL langsung via `postgres`, `pg`, Drizzle, atau Kysely.
- Validasi: Zod, TypeBox, atau Valibot.
- Auth: JWT + httpOnly cookie, atau session table.
- Upload: S3-compatible storage, local disk untuk dev, atau tetap Supabase Storage sementara.
- Email: Resend tetap bisa dipakai via `fetch`.
- XLSX export: tetap bisa memakai `xlsx`.

## Logic yang Harus Dipindahkan dari Frontend/SvelteKit Server

Wajib dipindahkan ke Bun service:

- `parsePrice`
- `normalizePhoneNumber`
- `getProductAddons`
- `getAddonSelectionPrice`
- Repricing checkout cart
- Repricing order form single product
- Generate invoice text/email
- Generate order confirmation email
- Admin order filters dan summary
- Slugify order form dan category
- Upload/remove storage file
- WhatsApp gateway wrapper

## Error Code yang Disarankan

```json
[
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "ORDER_NOT_FOUND",
  "CATEGORY_REQUIRED",
  "PRICE_CHANGED",
  "PRODUCT_UNAVAILABLE",
  "INVALID_PHONE_NUMBER",
  "INVALID_EMAIL",
  "UPLOAD_FAILED",
  "EMAIL_CONFIGURATION_ERROR",
  "EMAIL_SEND_FAILED",
  "WHATSAPP_GATEWAY_ERROR",
  "DATABASE_ERROR"
]
```

## Checklist Compatibility dengan UI Saat Ini

- Public product response tetap menyertakan `product_images`, `product_variants`, `product_addons`, dan `global_addons`, atau siapkan adapter di frontend.
- Admin order response tetap menyertakan `products(name)` dan `order_items(... products(name))`.
- Admin product response harus menyertakan category, images, variants, linked addons.
- `order_number` tetap tersedia untuk export dan pencarian.
- `proof_of_transfer` tetap berupa URL publik.
- `customized_options` tetap disimpan sebagai JSON.
- Fallback legacy order fields tetap diisi: `product_id`, `quantity`, `cake_size`, `cake_flavor`, `cake_color`, `crown_option`, `add_edible_glitter`, `cake_text`, `gift_card_text`.
- Cache public GET bisa dipertahankan dengan `Cache-Control` seperti sekarang.
