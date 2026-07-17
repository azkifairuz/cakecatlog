<script>
	import { fade, fly } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import Loading from '$lib/components/Loading.svelte';
	import PriceInput from '$lib/components/PriceInput.svelte';

	let { data, form } = $props();
	let editingAddon = $state(null);
	let isActive = $state(true);
	let isDarkColor = $state(false);
	let isDrawerOpen = $state(false);
	let isSubmitting = $state(false);
	let lockedCategory = $state('');

	let categoryQuery = $state('');
	let isCategoryDropdownOpen = $state(false);

	let searchQuery = $state('');
	let selectedCategoryFilter = $state('all');
	let viewMode = $state('card'); // 'card' or 'table'

	const defaultCategories = ['size', 'color', 'flavor', 'crown', 'glitter', 'cake_topper'];
	let allCategories = $derived([...new Set([...defaultCategories, ...data.addons.map(a => a.category)])]);

	let filteredCategories = $derived(
		categoryQuery.trim() === ''
			? allCategories
			: allCategories.filter(c => c.toLowerCase().includes(categoryQuery.trim().toLowerCase()))
	);

	let canCreateCategory = $derived(
		categoryQuery.trim() !== '' && !allCategories.some(c => c.toLowerCase() === categoryQuery.trim().toLowerCase())
	);

	function selectCategory(category) {
		categoryQuery = category;
		isCategoryDropdownOpen = false;
	}

	let filteredAddons = $derived(
		data.addons.filter(addon => {
			const matchesSearch = addon.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory = selectedCategoryFilter === 'all' || addon.category === selectedCategoryFilter;
			return matchesSearch && matchesCategory;
		})
	);

	let groupedAddons = $derived(
		filteredAddons.reduce((groups, addon) => {
			groups[addon.category] = [...(groups[addon.category] ?? []), addon];
			return groups;
		}, {})
	);

	function formatCurrency(amount) {
		if (!amount) return '-';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
	}

	function startEdit(addon) {
		editingAddon = addon;
		isActive = addon.is_active !== false;
		isDarkColor = Boolean(addon.is_dark_color);
		lockedCategory = '';
		categoryQuery = addon.category || '';
		isDrawerOpen = true;
	}

	function startCreate() {
		resetFormState();
		isDrawerOpen = true;
	}

	function startCreateForCategory(category) {
		resetFormState();
		lockedCategory = category;
		categoryQuery = category;
		isCategoryDropdownOpen = false;
		isDrawerOpen = true;
	}

	function resetFormState() {
		editingAddon = null;
		isActive = true;
		isDarkColor = false;
		isSubmitting = false;
		lockedCategory = '';
		categoryQuery = '';
		isDrawerOpen = false;
		isCategoryDropdownOpen = false;
	}

	function closeDrawer() {
		resetFormState();
	}
</script>

<div class="flex items-center justify-between gap-4 mb-4">
	<div>
		<h1 class="text-lg font-semibold md:text-2xl">Global Addons</h1>
		<p class="text-sm text-slate-500">Kelola addons global yang akan dipakai user saat order.</p>
	</div>
	<Button onclick={startCreate}>Tambah Baru</Button>
</div>

{#if form?.error || data.error}
	<div class="p-4 bg-destructive/15 text-destructive font-medium text-sm mb-4 rounded-md">
		Error: {form?.error || data.error}
	</div>
{/if}

<div class="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
	<div class="flex flex-1 items-center gap-3 w-full">
		<div class="relative max-w-sm flex-1">
			<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
			<Input bind:value={searchQuery} placeholder="Cari addon..." class="pl-9 bg-slate-50 border-slate-200 h-9" />
		</div>
		<select bind:value={selectedCategoryFilter} class="h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-primary max-w-[150px] capitalize">
			<option value="all">Semua Kategori</option>
			{#each allCategories as cat}
				<option value={cat}>{cat}</option>
			{/each}
		</select>
	</div>
	
	<div class="flex items-center gap-2 border-l border-slate-200 pl-4">
		<span class="text-xs font-medium text-slate-500">Tampilan:</span>
		<div class="flex bg-slate-100 p-1 rounded-lg">
			<button class="p-1.5 rounded-md transition-colors {viewMode === 'card' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" onclick={() => viewMode = 'card'} aria-label="Card View">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
			</button>
			<button class="p-1.5 rounded-md transition-colors {viewMode === 'table' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" onclick={() => viewMode = 'table'} aria-label="Table View">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
			</button>
		</div>
	</div>
</div>

{#if viewMode === 'card'}
	<div class="grid gap-5 lg:grid-cols-2 pb-24">
		{#each Object.entries(groupedAddons) as [category, addons]}
			<Card.Root class="border-slate-200 shadow-sm">
				<Card.Header>
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<Card.Title class="capitalize">{category}</Card.Title>
							<Badge variant="outline" class="mt-2">{addons.length} item</Badge>
						</div>
						<Button type="button" variant="outline" size="sm" class="shrink-0" onclick={() => startCreateForCategory(category)}>
							+ Addon
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#each addons as addon}
						<div class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
							<div>
								<p class="font-bold text-slate-800">{addon.name}</p>
								<p class="text-xs text-slate-500">
									{formatCurrency(addon.additional_price)}
									{#if addon.is_dark_color} · warna gelap +{formatCurrency(addon.dark_color_surcharge)}{/if}
								</p>
							</div>
							<div class="flex items-center gap-2">
								<form method="POST" action="?/toggleAddon" use:enhance onchange={(e) => e.currentTarget.requestSubmit()} class="flex items-center">
									<input type="hidden" name="id" value={addon.id} />
									<input type="hidden" name="is_active" value={addon.is_active.toString()} />
									<label class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-300 transition-colors has-[:checked]:bg-primary has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
										<input type="checkbox" class="peer sr-only" checked={addon.is_active} />
										<span class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
									</label>
								</form>
								<Button type="button" variant="outline" size="sm" onclick={() => startEdit(addon)}>Edit</Button>
								<form method="POST" action="?/deleteAddon" use:enhance onsubmit={(event) => {
									if (!confirm(`Hapus addon "${addon.name}"?`)) event.preventDefault();
								}}>
									<input type="hidden" name="id" value={addon.id} />
									<Button type="submit" variant="destructive" size="sm">Delete</Button>
								</form>
							</div>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-500">
				Tidak ada addon yang cocok dengan filter.
			</div>
		{/each}
	</div>
{:else}
	<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden pb-2 mb-24">
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm text-slate-600">
				<thead class="bg-slate-50/50 text-xs uppercase text-slate-500 border-b border-slate-200">
					<tr>
						<th class="px-4 py-3 font-semibold">Nama</th>
						<th class="px-4 py-3 font-semibold">Kategori</th>
						<th class="px-4 py-3 font-semibold">Harga Tambahan</th>
						<th class="px-4 py-3 font-semibold text-center">Status</th>
						<th class="px-4 py-3 font-semibold text-right">Aksi</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#each filteredAddons as addon}
						<tr class="hover:bg-slate-50 transition-colors">
							<td class="px-4 py-3 font-semibold text-slate-800">{addon.name}</td>
							<td class="px-4 py-3"><span class="capitalize px-2 py-1 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 border border-slate-200/60">{addon.category}</span></td>
							<td class="px-4 py-3">
								<span class="font-medium text-slate-700">{formatCurrency(addon.additional_price)}</span>
								{#if addon.is_dark_color}<br/><span class="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1">Gelap: +{formatCurrency(addon.dark_color_surcharge)}</span>{/if}
							</td>
							<td class="px-4 py-3 text-center">
								<form method="POST" action="?/toggleAddon" use:enhance onchange={(e) => e.currentTarget.requestSubmit()} class="inline-flex items-center">
									<input type="hidden" name="id" value={addon.id} />
									<input type="hidden" name="is_active" value={addon.is_active.toString()} />
									<label class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-300 transition-colors has-[:checked]:bg-primary">
										<input type="checkbox" class="peer sr-only" checked={addon.is_active} />
										<span class="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></span>
									</label>
								</form>
							</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-2">
									<Button type="button" variant="outline" size="sm" class="h-8 text-xs" onclick={() => startEdit(addon)}>Edit</Button>
									<form method="POST" action="?/deleteAddon" use:enhance onsubmit={(event) => {
										if (!confirm(`Hapus addon "${addon.name}"?`)) event.preventDefault();
									}}>
										<input type="hidden" name="id" value={addon.id} />
										<Button type="submit" variant="destructive" size="sm" class="h-8 text-xs">Delete</Button>
									</form>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="px-4 py-10 text-center text-slate-500 rounded-2xl border border-dashed border-slate-200 bg-white m-4">Tidak ada addon yang cocok dengan filter.</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}

<!-- BOTTOM SHEET DRAWER FOR FORM -->
{#if isDrawerOpen}
	<div class="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
		<button class="absolute inset-0 w-full h-full bg-slate-900/40 backdrop-blur-sm cursor-default" transition:fade={{duration: 200}} onclick={closeDrawer} aria-label="Close modal"></button>
		
		<div class="relative bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 pb-safe-12 w-full max-w-2xl mx-auto flex flex-col max-h-[90vh]" transition:fly={{ y: '100%', duration: 350, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}>
			{#if isSubmitting}
				<Loading
					variant="overlay"
					label={editingAddon ? 'Menyimpan addon' : 'Membuat addon'}
					description="Mohon tunggu, data addon sedang diproses."
					class="rounded-t-3xl"
				/>
			{/if}
			<div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6 shrink-0"></div>
			
			<div class="flex justify-between items-start mb-6 shrink-0">
				<div>
					<h3 class="text-2xl font-bold text-slate-800 mb-1">{editingAddon ? 'Edit Addon' : 'Tambah Addon'}</h3>
					<p class="text-sm text-slate-500">
						{lockedCategory ? `Addon baru akan masuk ke category ${lockedCategory}.` : 'Gunakan category untuk mengelompokkan pilihan di admin dan user.'}
					</p>
				</div>
				<button onclick={closeDrawer} aria-label="Tutup" class="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
				</button>
			</div>

			<div class="overflow-y-auto pb-4 flex-1 -mx-2 px-2">
				<form
					method="POST"
					action={editingAddon ? '?/updateAddon' : '?/createAddon'}
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update, result }) => {
							try {
								await update();
								if (result.type !== 'failure' && result.type !== 'error') resetFormState();
							} finally {
								isSubmitting = false;
							}
						};
					}}
					class="grid gap-4 md:grid-cols-2"
				>
					{#if editingAddon}
						<input type="hidden" name="id" value={editingAddon.id} />
					{/if}
					<div class="grid gap-2">
						<Label for="category_search">Category</Label>
						<input type="hidden" name="category" value={categoryQuery} />
						<div class="relative">
							<Input
								id="category_search"
								type="text"
								placeholder="Cari atau ketik category baru"
								bind:value={categoryQuery}
								readonly={Boolean(lockedCategory)}
								onfocus={() => {
									if (!lockedCategory) isCategoryDropdownOpen = true;
								}}
								oninput={() => {
									if (!lockedCategory) isCategoryDropdownOpen = true;
								}}
								class="bg-slate-50 focus:bg-white {lockedCategory ? 'cursor-not-allowed pr-24 text-slate-500' : ''}"
								autocomplete="off"
							/>
							{#if lockedCategory}
								<span class="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold uppercase tracking-wide text-slate-400">Locked</span>
							{:else}
								<button
									type="button"
									class="absolute inset-y-0 right-2 flex items-center px-2 text-slate-400 hover:text-slate-700"
									onclick={() => (isCategoryDropdownOpen = !isCategoryDropdownOpen)}
									aria-label="Toggle category dropdown"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</button>
							{/if}

							{#if isCategoryDropdownOpen && !lockedCategory}
								<button type="button" class="fixed inset-0 z-20 h-full w-full cursor-default" aria-label="Close dropdown" onclick={() => (isCategoryDropdownOpen = false)}></button>
								<div class="absolute z-30 mt-2 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
									{#each filteredCategories as cat}
										<button type="button" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 capitalize" onclick={() => selectCategory(cat)}>
											<span class="font-medium text-slate-700">{cat}</span>
											{#if categoryQuery.toLowerCase() === cat.toLowerCase()}<span class="text-xs font-bold text-primary">Selected</span>{/if}
										</button>
									{/each}
									{#if canCreateCategory}
										<button type="button" class="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/10" onclick={() => selectCategory(categoryQuery.trim())}>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
											Gunakan "{categoryQuery.trim()}"
										</button>
									{/if}
									{#if filteredCategories.length === 0 && !canCreateCategory}
										<div class="px-3 py-3 text-sm text-slate-500">Ketik untuk menggunakan category.</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
					<div class="grid gap-2">
						<Label for="name">Nama</Label>
						<Input id="name" name="name" required value={editingAddon?.name ?? ''} placeholder="8cm, Coklat, Gold Crown" />
					</div>
					<div class="grid gap-2">
						<Label for="additional_price">Additional Price</Label>
						<PriceInput id="additional_price" name="additional_price" value={editingAddon?.additional_price ?? ''} placeholder="0" />
					</div>
					<div class="grid gap-3 md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
						<p class="text-xs font-bold uppercase tracking-wide text-slate-500">Settings</p>
						<div class="grid gap-3 md:grid-cols-2">
							<Switch
								id="is_active"
								name="is_active"
								bind:checked={isActive}
								label="Aktif"
								description="Tampilkan addon ini ke user"
							/>
							<Switch
								id="is_dark_color"
								name="is_dark_color"
								bind:checked={isDarkColor}
								label="Warna Gelap"
								description="Aktifkan surcharge warna gelap"
							/>
						</div>
					</div>
					{#if isDarkColor}
						<div class="grid gap-2 md:col-span-2">
							<Label for="dark_color_surcharge">Dark Color Surcharge</Label>
							<PriceInput id="dark_color_surcharge" name="dark_color_surcharge" value={editingAddon?.dark_color_surcharge ?? ''} placeholder="0" />
						</div>
					{:else}
						<input type="hidden" name="dark_color_surcharge" value="0" />
					{/if}
					<div class="md:col-span-2 pt-4 flex gap-3 sticky bottom-0 bg-white shadow-[0_-10px_20px_white]">
						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{#if isSubmitting}
								<Loading label="Menyimpan..." size="sm" class="text-white" />
							{:else}
								{editingAddon ? 'Simpan Addon' : 'Tambah Addon'}
							{/if}
						</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
