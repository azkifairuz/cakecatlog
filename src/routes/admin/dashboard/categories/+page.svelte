<script>
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Loading from '$lib/components/Loading.svelte';
	import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';

	let { data, form } = $props();
	
	let isAdding = $state(false);
	let creating = $state(false);
	let deletingId = $state(null);
</script>

<AdminPage>
<AdminPageHeader title="Kategori Kue" description="Kelompokkan produk agar katalog lebih mudah dicari.">
	{#snippet actions()}<Button onclick={() => isAdding = !isAdding}>{isAdding ? 'Batal' : 'Tambah Kategori'}</Button>{/snippet}
</AdminPageHeader>

{#if form?.error}
	<div class="p-4 bg-red-50 text-red-600 font-medium text-sm rounded-xl mb-6 border border-red-100">
		Error: {form.error}
	</div>
{/if}

{#if isAdding}
	<Card.Root class="mb-8 border-primary/20 shadow-sm animate-in slide-in-from-top-4 fade-in duration-200">
		<Card.Content class="relative p-6">
			{#if creating}
				<Loading
					variant="overlay"
					label="Menyimpan kategori"
					description="Mohon tunggu, kategori baru sedang dibuat."
					class="rounded-xl"
				/>
			{/if}
			<form method="POST" action="?/createCategory" use:enhance={() => {
				creating = true;
				return async ({ update, result }) => {
					try {
						await update();
						if (result.type === 'success') {
							isAdding = false;
						}
					} finally {
						creating = false;
					}
				};
			}} class="space-y-4 max-w-md">
				<div>
					<Label for="name" class="font-bold text-[#4A3B32]">Nama Kategori</Label>
					<Input type="text" id="name" name="name" placeholder="Contoh: Wedding Cake" required class="mt-2 h-12 rounded-xl bg-slate-50 border-primary/20" />
					<p class="text-xs text-[#4A3B32]/70 mt-2">Slug akan dibuat secara otomatis berdasarkan nama ini.</p>
				</div>
				<Button type="submit" disabled={creating} class="w-full h-12 rounded-xl bg-primary hover:bg-[#724828] text-white font-bold transition-all shadow-md">
					{#if creating}
						<Loading label="Menyimpan..." size="sm" class="text-white" />
					{:else}
						Simpan Kategori
					{/if}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
{/if}

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
	{#each data.categories as category (category.id)}
		<Card.Root class="group relative border-primary/20 shadow-sm transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
			<Card.Content class="p-5 flex items-center justify-between gap-4">
				<div class="flex min-w-0 flex-col">
					<h3 class="font-bold text-lg text-[#4A3B32] leading-tight">{category.name}</h3>
					<span class="text-xs font-medium text-[#4A3B32]/50 bg-slate-50 px-2 py-0.5 rounded-md mt-1.5 w-fit">/{category.slug}</span>
				</div>
				<a
					href={`/admin/dashboard/categories/${encodeURIComponent(category.slug)}`}
					class="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label={`Lihat produk kategori ${category.name}`}
				></a>
				<div class="pointer-events-none relative z-10 flex items-center gap-1">
					<ArrowRightIcon class="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
				<form class="pointer-events-auto" method="POST" action="?/deleteCategory" use:enhance={() => {
					deletingId = category.id;
					return async ({ update }) => {
						await update();
						deletingId = null;
					};
				}}>
					<input type="hidden" name="id" value={category.id} />
					<Button type="submit" variant="ghost" size="icon" disabled={deletingId === category.id} aria-label={`Hapus kategori ${category.name}`} onclick={(e) => {
						if (!confirm('Hapus kategori ini? Jika dihapus, produk dengan kategori ini tidak akan memiliki kategori (menjadi kosong).')) e.preventDefault();
					}}>
						{#if deletingId === category.id}
							<Loading label="" size="sm" />
						{:else}
						<Trash2Icon />
						{/if}
					</Button>
				</form>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="col-span-full"><AdminEmptyState title="Belum ada kategori" description="Tambahkan kategori pertama untuk mulai mengelompokkan produk." /></div>
	{/each}
</div>
</AdminPage>
