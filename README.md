# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.15.3 create --template minimal --no-types --add tailwindcss="plugins:none" --install npm formjualkue
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Salin `.env.example` menjadi `.env` dan isi konfigurasi yang diperlukan. Integrasi WhatsApp
memakai `WA_GATEWAY_URL` dan `WA_GATEWAY_API_KEY` yang hanya boleh tersedia di server.
Generate API key gateway dengan `bun run key:generate` di project `wagateway`; jangan memakai
prefix `PUBLIC_` atau menyimpan key di kode frontend. Rotasi key mengikuti urutan primary/previous
key yang didokumentasikan oleh gateway.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Delivery address autocomplete

Checkout, order langsung, dan form pembelian custom memakai Google Places Autocomplete
(New) untuk saran alamat Indonesia. Ketik minimal 3 karakter, pilih saran, lalu tambahkan
nomor rumah/RT/RW/patokan pada field yang sama. Alamat manual tetap diterima.

Isi `PUBLIC_GOOGLE_MAPS_API_KEY` pada environment frontend lalu deploy ulang. Aktifkan
Maps JavaScript API dan Places API (New), serta billing, pada project Google Cloud.
Key ini dipakai browser: batasi HTTP referrers ke `https://dessertbyfir.com/*`, domain
preview yang memang dipakai, dan `http://localhost:5173/*` untuk development. Batasi
API key ke Maps JavaScript API dan Places API (New). Jangan menggunakan key server
tanpa pembatasan. Tidak diperlukan env Maps di backend atau migration database.

Tanpa key atau saat Maps gagal, input alamat manual tetap berfungsi. Library dimuat
saat alamat dicari dan digunakan bersama; tidak ada request pencarian saat pickup.
Alamat tetap dikirim ke backend sebagai string `address`, tanpa place ID atau koordinat.

Referensi: https://developers.google.com/maps/documentation/javascript/place-autocomplete-data
Setup: https://developers.google.com/maps/documentation/javascript/place-get-started
