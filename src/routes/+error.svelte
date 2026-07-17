<script>
	import { page } from '$app/stores';
	import { Home, Search, MessageCircle } from 'lucide-svelte';

	let isNotFound = $derived($page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? 'Page Not Found' : 'Something went wrong'} | dessertbyfir</title>
</svelte:head>

<section class="relative min-h-[70vh] overflow-hidden bg-[#FFFBF7] px-6 py-16 text-[#4A3B32] sm:py-24">
	<div class="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>
	<div class="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-rose-100 blur-3xl"></div>

	<div class="relative mx-auto flex max-w-4xl flex-col items-center text-center">
		<div class="mb-7 inline-flex h-20 w-20 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-xl shadow-primary/10">
			{#if isNotFound}
				<Search class="h-9 w-9" strokeWidth={1.8} />
			{:else}
				<MessageCircle class="h-9 w-9" strokeWidth={1.8} />
			{/if}
		</div>

		<p class="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-primary/80">
			{isNotFound ? '404 - Not Found' : `Error ${$page.status}`}
		</p>
		<h1 class="max-w-2xl font-['Playfair_Display'] text-4xl font-bold leading-tight sm:text-5xl">
			{isNotFound ? 'Halaman yang kamu cari tidak ditemukan.' : 'Ada kendala saat membuka halaman ini.'}
		</h1>
		<p class="mt-5 max-w-xl text-sm leading-7 text-[#4A3B32]/65 sm:text-base">
			{isNotFound
				? 'Link mungkin sudah berubah, produk sudah tidak tersedia, atau alamat halaman kurang tepat.'
				: 'Silakan kembali ke halaman utama dan coba lagi dari sana.'}
		</p>

		<div class="mt-9 flex flex-col gap-3 sm:flex-row">
			<a
				href="/"
				class="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/15 transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-[#724828] hover:shadow-primary/25 active:scale-[0.97]"
			>
				<Home class="h-4 w-4" />
				Kembali ke Home
			</a>
			<a
				href="/catalog"
				class="inline-flex items-center justify-center rounded-full border border-primary/20 bg-white px-7 py-3.5 text-sm font-bold text-primary transition-[background-color,transform,border-color] duration-150 ease-out hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97]"
			>
				Lihat Catalog
			</a>
		</div>
	</div>
</section>
