<script>
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form } = $props();
	
	let isAdding = $state(false);
	let creating = $state(false);
	let deletingId = $state(null);
</script>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-slate-800">Kategori Kue</h1>
	<Button onclick={() => isAdding = !isAdding} class="bg-slate-900 hover:bg-slate-800 rounded-xl px-5">
		{isAdding ? 'Batal' : '+ Tambah Kategori'}
	</Button>
</div>

{#if form?.error}
	<div class="p-4 bg-red-50 text-red-600 font-medium text-sm rounded-xl mb-6 border border-red-100">
		Error: {form.error}
	</div>
{/if}

{#if isAdding}
	<Card.Root class="mb-8 border-slate-200 shadow-sm animate-in slide-in-from-top-4 fade-in duration-200">
		<Card.Content class="p-6">
			<form method="POST" action="?/createCategory" use:enhance={() => {
				creating = true;
				return async ({ update, result }) => {
					await update();
					creating = false;
					if (result.type === 'success') {
						isAdding = false;
					}
				};
			}} class="space-y-4 max-w-md">
				<div>
					<Label for="name" class="font-bold text-slate-700">Nama Kategori</Label>
					<Input type="text" id="name" name="name" placeholder="Contoh: Wedding Cake" required class="mt-2 h-12 rounded-xl bg-slate-50 border-slate-200" />
					<p class="text-xs text-slate-500 mt-2">Slug akan dibuat secara otomatis berdasarkan nama ini.</p>
				</div>
				<Button type="submit" disabled={creating} class="w-full h-12 rounded-xl bg-[#8C5A35] hover:bg-[#724828] text-white font-bold transition-all shadow-md">
					{creating ? 'Menyimpan...' : 'Simpan Kategori'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
{/if}

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
	{#each data.categories as category (category.id)}
		<Card.Root class="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
			<Card.Content class="p-5 flex items-center justify-between gap-4">
				<div class="flex flex-col">
					<h3 class="font-bold text-lg text-slate-800 leading-tight">{category.name}</h3>
					<span class="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md mt-1.5 w-fit">/{category.slug}</span>
				</div>
				
				<form method="POST" action="?/deleteCategory" use:enhance={() => {
					deletingId = category.id;
					return async ({ update }) => {
						await update();
						deletingId = null;
					};
				}}>
					<input type="hidden" name="id" value={category.id} />
					<Button type="submit" variant="ghost" size="icon" disabled={deletingId === category.id} class="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full w-10 h-10 transition-colors" onclick={(e) => {
						if (!confirm('Hapus kategori ini? Jika dihapus, produk dengan kategori ini tidak akan memiliki kategori (menjadi kosong).')) e.preventDefault();
					}}>
						{#if deletingId === category.id}
							<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
						{:else}
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
						{/if}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
			<div class="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
			</div>
			<p class="font-medium text-slate-500 mb-1">Belum ada kategori yang dibuat.</p>
			<p class="text-sm text-slate-400">Silakan klik tombol "Tambah Kategori" di atas.</p>
		</div>
	{/each}
</div>
