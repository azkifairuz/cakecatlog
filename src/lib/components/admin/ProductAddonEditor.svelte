<script>
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Field from '$lib/components/ui/field';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import { cn } from '$lib/utils.js';
	import PriceInput from '$lib/components/PriceInput.svelte';
	import AdminSearchField from '$lib/components/admin/AdminSearchField.svelte';
	import {
		buildFixedProductAddonStates,
		getEffectiveSelectedAddonCount,
		getEffectiveSelectedAddonIds
	} from '$lib/product-addon-selection.js';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import CheckIcon from '@lucide/svelte/icons/check';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import XIcon from '@lucide/svelte/icons/x';

	let {
		globalAddons = [],
		productAddonStates = $bindable({}),
		customizeAddons = $bindable(false),
		newAddonRows = $bindable([])
	} = $props();

	let isOpen = $state(false);
	let isDiscardOpen = $state(false);
	let editorView = $state('selection');
	let searchQuery = $state('');
	let selectedCategory = $state('');
	let draftSelectedIds = $state([]);
	let draftNewAddonRows = $state([]);
	let editorSnapshot = $state('');
	let addonDraft = $state(createEmptyAddonDraft());

	let categories = $derived(
		[
			...new Set(
				[
					...globalAddons.map((addon) => addon.category?.trim()),
					...draftNewAddonRows.map((addon) => addon.category?.trim())
				].filter(Boolean)
			)
		].sort((a, b) => a.localeCompare(b, 'id'))
	);
	let normalizedQuery = $derived(searchQuery.trim().toLowerCase());
	let matchingCategories = $derived(
		categories.filter((category) =>
			category.toLowerCase().includes(normalizedQuery) ||
			globalAddons.some(
				(addon) =>
					addon.category === category && addon.name.toLowerCase().includes(normalizedQuery)
			) ||
			draftNewAddonRows.some(
				(addon) =>
					addon.category === category && addon.name.toLowerCase().includes(normalizedQuery)
			)
		)
	);
	let activeCategory = $derived(
		matchingCategories.includes(selectedCategory) ? selectedCategory : (matchingCategories[0] ?? '')
	);
	let visibleAddons = $derived(
		globalAddons.filter(
			(addon) =>
				addon.category === activeCategory &&
				(!normalizedQuery ||
					addon.name.toLowerCase().includes(normalizedQuery) ||
					addon.category.toLowerCase().includes(normalizedQuery))
		)
	);
	let visibleDraftNewAddons = $derived(
		draftNewAddonRows
			.map((row, index) => ({ row, index }))
			.filter(
				({ row }) =>
					row.category === activeCategory &&
					(!normalizedQuery ||
						row.name.toLowerCase().includes(normalizedQuery) ||
						row.category.toLowerCase().includes(normalizedQuery))
			)
	);
	let selectedExistingCount = $derived(
		customizeAddons
			? getEffectiveSelectedAddonCount(globalAddons, productAddonStates)
			: globalAddons.filter((addon) => addon.is_active !== false).length
	);
	let summarySelectedCount = $derived(selectedExistingCount + (customizeAddons ? newAddonRows.length : 0));
	let summaryTotalCount = $derived(globalAddons.length + (customizeAddons ? newAddonRows.length : 0));
	let draftTotalCount = $derived(globalAddons.length + draftNewAddonRows.length);

	function createEmptyAddonDraft() {
		return {
			category: '',
			categoryQuery: '',
			name: '',
			additional_price: '',
			is_dark_color: false,
			dark_color_surcharge: '',
			is_active: true
		};
	}

	function serializeEditorDraft() {
		return JSON.stringify({
			selected: [...draftSelectedIds].sort(),
			newAddons: draftNewAddonRows,
			pendingAddon: addonDraft
		});
	}

	function isEditorDirty() {
		return serializeEditorDraft() !== editorSnapshot;
	}

	function openEditor() {
		draftSelectedIds = getEffectiveSelectedAddonIds(globalAddons, productAddonStates);
		draftNewAddonRows = newAddonRows.map((row) => ({ ...row }));
		selectedCategory = categories[0] ?? '';
		searchQuery = '';
		editorView = 'selection';
		addonDraft = createEmptyAddonDraft();
		editorSnapshot = serializeEditorDraft();
		isOpen = true;
	}

	function handleOpenChange(nextOpen) {
		if (nextOpen) {
			isOpen = true;
			return;
		}
		if (isEditorDirty()) {
			isDiscardOpen = true;
			return;
		}
		isOpen = false;
	}

	function closeWithoutSaving() {
		isDiscardOpen = false;
		isOpen = false;
	}

	function isSelected(addonId) {
		return draftSelectedIds.includes(addonId);
	}

	function setAddonSelected(addonId, checked) {
		draftSelectedIds = checked
			? [...new Set([...draftSelectedIds, addonId])]
			: draftSelectedIds.filter((id) => id !== addonId);
	}

	function getCategoryAddons(category) {
		return globalAddons.filter((addon) => addon.category === category);
	}

	function getCategorySelectedCount(category) {
		return (
			getCategoryAddons(category).filter((addon) => isSelected(addon.id)).length +
			draftNewAddonRows.filter((addon) => addon.category === category).length
		);
	}

	function getCategoryTotalCount(category) {
		return (
			getCategoryAddons(category).length +
			draftNewAddonRows.filter((addon) => addon.category === category).length
		);
	}

	function selectCategoryAddons(category, selected) {
		const ids = getCategoryAddons(category).map((addon) => addon.id);
		draftSelectedIds = selected
			? [...new Set([...draftSelectedIds, ...ids])]
			: draftSelectedIds.filter((id) => !ids.includes(id));
	}

	function applySelection() {
		productAddonStates = buildFixedProductAddonStates(globalAddons, draftSelectedIds);
		newAddonRows = draftNewAddonRows.map((row) => ({ ...row }));
		customizeAddons = true;
		editorSnapshot = serializeEditorDraft();
		isOpen = false;
	}

	function resetToGlobal() {
		productAddonStates = {};
		newAddonRows = [];
		customizeAddons = false;
	}

	function canAddDraft() {
		return Boolean(addonDraft.categoryQuery.trim() && addonDraft.name.trim());
	}

	function addDraftAddon() {
		if (!canAddDraft()) return;
		const category = addonDraft.categoryQuery.trim();
		draftNewAddonRows = [
			...draftNewAddonRows,
			{
				...addonDraft,
				category,
				categoryQuery: category,
				name: addonDraft.name.trim()
			}
		];
		addonDraft = createEmptyAddonDraft();
		editorView = 'selection';
	}

	function removeDraftAddon(index) {
		draftNewAddonRows = draftNewAddonRows.filter((_, rowIndex) => rowIndex !== index);
	}

	function formatCurrency(amount) {
		if (!amount) return 'Gratis';
		return new Intl.NumberFormat('id-ID', {
			style: 'currency',
			currency: 'IDR',
			maximumFractionDigits: 0
		}).format(amount);
	}
</script>

<section class="rounded-xl border border-border bg-muted/25 p-4 md:col-span-2">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex min-w-0 items-start gap-3">
			<div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<ListChecksIcon class="size-5" />
			</div>
			<div class="min-w-0">
				<div class="flex flex-wrap items-center gap-2">
					<h3 class="text-sm font-semibold text-foreground">Addons produk</h3>
					<Badge variant={customizeAddons ? 'default' : 'secondary'}>
						{customizeAddons ? 'Pilihan khusus' : 'Mengikuti global'}
					</Badge>
				</div>
				<p class="mt-1 text-xs leading-relaxed text-muted-foreground">
					{customizeAddons
						? `${summarySelectedCount} dari ${summaryTotalCount} addon dipilih untuk produk ini.`
						: `${selectedExistingCount} addon aktif mengikuti pengaturan global.`}
				</p>
			</div>
		</div>
		<div class="flex shrink-0 flex-wrap gap-2">
			{#if customizeAddons}
				<Button type="button" variant="ghost" size="sm" onclick={resetToGlobal}>
					<RotateCcwIcon data-icon="inline-start" />
					Ikuti global
				</Button>
			{/if}
			<Button type="button" variant="outline" size="sm" onclick={openEditor}>
				<ListChecksIcon data-icon="inline-start" />
				Atur addons
			</Button>
		</div>
	</div>
</section>

<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content
		class="box-border flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 overflow-hidden overscroll-contain rounded-none p-0 sm:h-[min(720px,calc(100dvh-2rem))] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-6xl sm:rounded-xl"
		showCloseButton={false}
	>
		<Dialog.Header class="min-w-0 shrink-0 gap-1 px-4 py-3 text-left sm:px-5 sm:py-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0 flex-1">
					<div class="flex min-w-0 flex-wrap items-center gap-2">
						<Dialog.Title class="min-w-0 break-words leading-snug">{editorView === 'selection' ? 'Pilih addons produk' : 'Tambah addon baru'}</Dialog.Title>
						{#if editorView === 'selection'}
							<Badge class="shrink-0" variant="outline">{draftSelectedIds.length + draftNewAddonRows.length} / {draftTotalCount}</Badge>
						{/if}
					</div>
					<Dialog.Description class="mt-1 whitespace-normal break-words pr-1 leading-snug">
						{editorView === 'selection'
							? 'Pilihan ini tetap untuk produk meskipun pengaturan global berubah.'
							: 'Addon baru akan ditambahkan ke global addons dan langsung dipilih untuk produk ini.'}
					</Dialog.Description>
				</div>
				<Button type="button" variant="ghost" size="icon-sm" class="shrink-0" onclick={() => handleOpenChange(false)} aria-label="Tutup pengaturan addon">
					<XIcon />
				</Button>
			</div>
		</Dialog.Header>
		<Separator />

		{#if editorView === 'selection'}
			<div class="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:grid-cols-[210px_minmax(0,1fr)] sm:grid-rows-1 lg:grid-cols-[240px_minmax(0,1fr)]">
				<aside class="flex min-h-0 flex-col border-b border-border bg-muted/25 sm:border-r sm:border-b-0">
					<div class="p-3">
						<AdminSearchField bind:value={searchQuery} class="h-11" placeholder="Cari addon..." label="Cari addon produk" />
					</div>
					<nav class="min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-1 sm:snap-none sm:overflow-y-auto sm:[scrollbar-width:auto] sm:[&::-webkit-scrollbar]:block" aria-label="Kategori addon">
						<div class="flex w-max min-w-full gap-2 px-3 pb-3 sm:w-auto sm:min-w-0 sm:flex-col">
							{#each matchingCategories as category}
								<button
									type="button"
									class={cn(
										'flex min-h-11 min-w-36 max-w-[min(13rem,75vw)] shrink-0 snap-start scroll-ml-3 scroll-mr-3 items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none transition-[background-color,color,transform] duration-150 ease-out focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:scroll-auto motion-reduce:transition-none sm:min-w-0 sm:max-w-none sm:shrink',
										activeCategory === category
											? 'bg-background text-foreground shadow-sm ring-1 ring-border'
											: 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
									)}
									onclick={() => (selectedCategory = category)}
									aria-current={activeCategory === category ? 'true' : undefined}
								>
									<span class="min-w-0 whitespace-normal break-words capitalize leading-snug">{category}</span>
									<span class="shrink-0 text-xs tabular-nums">{getCategorySelectedCount(category)}/{getCategoryTotalCount(category)}</span>
								</button>
							{/each}
						</div>
					</nav>
					<div class="hidden p-3 sm:block">
						<Button type="button" variant="outline" class="w-full" onclick={() => (editorView = 'create')}>
							<PlusIcon data-icon="inline-start" />
							Addon baru
						</Button>
					</div>
				</aside>

				<div class="flex min-h-0 min-w-0 flex-col overflow-hidden">
					{#if activeCategory}
						<div class="product-addon-category-toolbar px-4 py-3 sm:px-5">
							<div class="min-w-0">
								<h3 class="whitespace-normal break-words font-semibold capitalize leading-snug text-foreground">{activeCategory}</h3>
								<p class="text-xs text-muted-foreground">{getCategorySelectedCount(activeCategory)} dari {getCategoryTotalCount(activeCategory)} dipilih</p>
							</div>
							<div class="product-addon-category-actions">
								<Button type="button" variant="ghost" size="sm" class="w-full min-w-0 max-w-full" onclick={() => selectCategoryAddons(activeCategory, false)}>Kosongkan</Button>
								<Button type="button" variant="secondary" size="sm" class="w-full min-w-0 max-w-full" onclick={() => selectCategoryAddons(activeCategory, true)}>
									<CheckIcon data-icon="inline-start" />
									Pilih semua
								</Button>
							</div>
						</div>
						<Separator />
						<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-5">
							<div class="grid gap-2 lg:grid-cols-2">
								{#each visibleAddons as addon (addon.id)}
									<label
										class={cn(
											'group flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border bg-background p-3 transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out hover:border-primary/35 hover:bg-muted/25 active:scale-[0.99] motion-reduce:transition-none',
											isSelected(addon.id) ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border'
										)}
									>
										<Checkbox
											checked={isSelected(addon.id)}
											onCheckedChange={(checked) => setAddonSelected(addon.id, checked)}
											aria-label={`Pilih ${addon.name}`}
										/>
										<span class="min-w-0 flex-1">
											<span class="flex min-w-0 flex-wrap items-center gap-2">
												<span class="min-w-0 whitespace-normal break-words text-sm font-semibold leading-snug text-foreground">{addon.name}</span>
												{#if addon.is_active === false}<Badge variant="outline">Global nonaktif</Badge>{/if}
											</span>
											<span class="mt-0.5 block text-xs text-muted-foreground">{formatCurrency(addon.additional_price)}</span>
										</span>
									</label>
								{/each}
							</div>

							{#if visibleDraftNewAddons.length > 0}
								<div class="mt-5 flex flex-col gap-2">
									<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Addon baru dalam draft</p>
									{#each visibleDraftNewAddons as { row, index }}
										<div class="flex items-center gap-3 rounded-xl border border-dashed border-primary/35 bg-primary/5 p-3">
											<Checkbox checked disabled aria-label={`${row.name} otomatis dipilih`} />
											<div class="min-w-0 flex-1">
												<div class="flex min-w-0 flex-wrap items-center gap-2"><span class="min-w-0 break-words font-semibold">{row.name}</span><Badge>Baru</Badge></div>
												<p class="break-words text-xs text-muted-foreground">{row.category} · {formatCurrency(row.additional_price)}</p>
											</div>
											<Button type="button" variant="ghost" size="icon-sm" onclick={() => removeDraftAddon(index)} aria-label={`Hapus addon baru ${row.name}`}>
												<Trash2Icon />
											</Button>
										</div>
									{/each}
								</div>
							{/if}

							{#if visibleAddons.length === 0 && visibleDraftNewAddons.length === 0}
								<div class="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
									<p class="font-medium text-foreground">Addon tidak ditemukan</p>
									<p class="text-xs text-muted-foreground">Coba kata pencarian lain.</p>
								</div>
							{/if}
						</div>
					{:else}
						<div class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
							<ListChecksIcon class="size-8 text-muted-foreground" />
							<div><p class="font-medium">Belum ada addon</p><p class="text-xs text-muted-foreground">Tambahkan addon global pertama untuk mulai memilih.</p></div>
							<Button type="button" variant="outline" onclick={() => (editorView = 'create')}><PlusIcon data-icon="inline-start" />Addon baru</Button>
						</div>
					{/if}
				</div>
			</div>
			<Separator />
			<Dialog.Footer class="grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:justify-between sm:px-5 sm:py-4">
				<Button type="button" variant="outline" class="min-w-0 sm:hidden" onclick={() => (editorView = 'create')}>
					<PlusIcon data-icon="inline-start" />Baru
				</Button>
				<div class="ml-auto grid min-w-0 grid-cols-2 gap-2 sm:flex sm:justify-end">
					<Button type="button" variant="ghost" onclick={() => handleOpenChange(false)}>Batal</Button>
					<Button type="button" onclick={applySelection}>
						<span class="sm:hidden">Terapkan</span><span class="hidden sm:inline">Terapkan pilihan</span>
					</Button>
				</div>
			</Dialog.Footer>
		{:else}
			<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
				<div class="mx-auto flex max-w-2xl flex-col gap-5">
					<Button type="button" variant="ghost" class="self-start" onclick={() => (editorView = 'selection')}>
						<ArrowLeftIcon data-icon="inline-start" />Kembali ke pilihan
					</Button>
					<Field.FieldSet>
						<Field.FieldLegend>Detail addon</Field.FieldLegend>
						<Field.FieldDescription>Isi informasi addon yang akan tersedia secara global.</Field.FieldDescription>
						<Field.FieldGroup class="mt-4">
							<Field.Field>
								<Field.FieldLabel for="new-addon-category">Kategori</Field.FieldLabel>
								<Input id="new-addon-category" bind:value={addonDraft.categoryQuery} list="product-addon-categories" placeholder="Contoh: Bunga" />
								<datalist id="product-addon-categories">
									{#each categories as category}<option value={category}></option>{/each}
								</datalist>
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="new-addon-name">Nama addon</Field.FieldLabel>
								<Input id="new-addon-name" bind:value={addonDraft.name} placeholder="Contoh: Mawar putih" />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="new-addon-price">Harga tambahan</Field.FieldLabel>
								<PriceInput id="new-addon-price" bind:value={addonDraft.additional_price} placeholder="Rp 0" />
							</Field.Field>
						</Field.FieldGroup>
					</Field.FieldSet>
					<div class="grid gap-3 sm:grid-cols-2">
						<Switch bind:checked={addonDraft.is_active} label="Aktif secara global" description="Addon langsung tersedia untuk produk lain." />
						<Switch bind:checked={addonDraft.is_dark_color} label="Warna gelap" description="Tambahkan biaya khusus warna gelap." />
					</div>
					{#if addonDraft.is_dark_color}
						<Field.Field>
							<Field.FieldLabel for="new-addon-dark-surcharge">Biaya warna gelap</Field.FieldLabel>
							<PriceInput id="new-addon-dark-surcharge" bind:value={addonDraft.dark_color_surcharge} placeholder="Rp 0" />
						</Field.Field>
					{/if}
				</div>
			</div>
			<Separator />
			<Dialog.Footer class="grid shrink-0 grid-cols-2 gap-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:px-5 sm:py-4">
				<Button type="button" variant="ghost" class="w-full sm:w-auto" onclick={() => (editorView = 'selection')}>Batal</Button>
				<Button type="button" class="w-full sm:w-auto" disabled={!canAddDraft()} onclick={addDraftAddon}>
					<PlusIcon data-icon="inline-start" />Tambahkan addon
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.product-addon-category-toolbar {
		display: grid;
		width: 100%;
		min-width: 0;
		max-width: 100%;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.75rem;
		overflow: hidden;
	}

	.product-addon-category-actions {
		display: grid;
		width: min(100%, 24rem);
		min-width: 0;
		max-width: 100%;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		justify-self: start;
		gap: 0.5rem;
		overflow: hidden;
	}

	.product-addon-category-actions :global([data-slot='button']) {
		width: 100%;
		min-width: 0;
		max-width: 100%;
	}
</style>

<Dialog.Root bind:open={isDiscardOpen}>
	<Dialog.Content class="max-w-md" showCloseButton={false}>
		<Dialog.Header>
			<Dialog.Title>Buang perubahan addon?</Dialog.Title>
			<Dialog.Description>Pilihan yang belum diterapkan akan hilang.</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={() => (isDiscardOpen = false)}>Lanjut mengedit</Button>
			<Button type="button" variant="destructive" onclick={closeWithoutSaving}>Buang perubahan</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
