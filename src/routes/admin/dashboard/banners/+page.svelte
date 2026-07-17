<script>
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Loading from '$lib/components/Loading.svelte';
	import { getImageUrl } from '$lib/image-url.js';
	import { Plus, Trash2, GripVertical, Check, X, AlertCircle, Image } from 'lucide-svelte';
	
	let { data } = $props();
	
	let banners = $state([]);
	let isUploading = $state(false);
	let isSaving = $state(false);
	
	// Re-sync data when load function reruns
	$effect(() => {
		if (data.banners) {
			banners = [...data.banners];
		}
	});

	function handleUpload() {
		isUploading = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					toast.success('Banner berhasil diunggah!');
					update();
				} else if (result.type === 'failure') {
					toast.error(result.data?.error || 'Gagal mengunggah banner.');
				} else {
					update();
				}
			} finally {
				isUploading = false;
			}
		};
	}

	function handleUpdateAll() {
		// Validation on client side first
		const activeCount = banners.filter(b => b.is_active).length;
		if (activeCount < 2) {
			toast.error('Minimal harus ada 2 banner yang aktif!');
			return ({ cancel }) => cancel();
		}
		if (activeCount > 5) {
			toast.error('Maksimal hanya boleh 5 banner yang aktif!');
			return ({ cancel }) => cancel();
		}

		isSaving = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'success') {
					toast.success('Perubahan berhasil disimpan!');
					update();
				} else if (result.type === 'failure') {
					toast.error(result.data?.error || 'Gagal menyimpan perubahan.');
				}
			} finally {
				isSaving = false;
			}
		};
	}

	function handleDelete() {
		return async ({ result, update }) => {
			if (result.type === 'success') {
				toast.success('Banner berhasil dihapus!');
				update();
			} else if (result.type === 'failure') {
				toast.error(result.data?.error || 'Gagal menghapus banner.');
			}
		};
	}
	
	let activeCount = $derived(banners.filter(b => b.is_active).length);
</script>

<div class="flex flex-col gap-6 w-full max-w-5xl mx-auto">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-slate-900">Banners Management</h1>
			<p class="text-slate-500 mt-1">Unggah dan atur hero banner yang muncul di beranda.</p>
		</div>
	</div>

	<!-- Stats & Validation Card -->
	<div class="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
		<div class="flex items-center gap-4">
			<div class="h-12 w-12 rounded-full flex items-center justify-center {activeCount >= 2 && activeCount <= 5 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
				<Image class="h-6 w-6" />
			</div>
			<div>
				<h3 class="font-semibold text-slate-800">Status Banner</h3>
				<p class="text-sm text-slate-500">{activeCount} dari {banners.length} banner aktif saat ini.</p>
			</div>
		</div>
		
		{#if activeCount < 2 || activeCount > 5}
			<div class="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-xl text-sm font-medium border border-red-100">
				<AlertCircle class="h-4 w-4" />
				<span>Minimal 2 dan Maksimal 5 banner aktif!</span>
			</div>
		{:else}
			<div class="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl text-sm font-medium border border-green-100">
				<Check class="h-4 w-4" />
				<span>Status Valid</span>
			</div>
		{/if}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Upload New Banner -->
		<div class="lg:col-span-1">
			<div class="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
				{#if isUploading}
					<Loading
						variant="overlay"
						label="Mengunggah banner"
						description="Mohon tunggu, gambar banner sedang diunggah."
						class="rounded-2xl"
					/>
				{/if}
				<div class="p-5 border-b border-slate-100">
					<h3 class="font-bold text-slate-800">Tambah Banner Baru</h3>
				</div>
				<div class="p-5">
					<form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance={handleUpload} class="flex flex-col gap-4">
						<div class="space-y-2">
							<Label for="image">File Gambar</Label>
							<Input id="image" name="image" type="file" accept="image/*" required class="cursor-pointer file:text-primary file:bg-primary/10 file:rounded-lg file:border-0 file:mr-4 file:px-4 file:py-2 file:font-semibold hover:file:bg-primary/20" />
							<p class="text-[11px] text-slate-500">Rekomendasi rasio 16:9 atau landscape lebar.</p>
						</div>
						
						<div class="flex items-center gap-2 pt-2">
							<input type="checkbox" id="is_active" name="is_active" class="rounded border-slate-300 text-primary focus:ring-primary" checked={activeCount < 5} />
							<Label for="is_active" class="text-sm cursor-pointer">Langsung Aktifkan</Label>
						</div>

						<Button type="submit" disabled={isUploading} class="w-full mt-2 bg-primary hover:bg-[#724828] text-white rounded-xl">
							{#if isUploading}
								<Loading label="Mengunggah..." size="sm" class="text-white" />
							{:else}
								<Plus class="h-4 w-4 mr-2" /> Unggah Banner
							{/if}
						</Button>
					</form>
				</div>
			</div>
		</div>

			<!-- Manage Banners -->
			<div class="lg:col-span-2 space-y-4">
				<form id="banners-update-form" method="POST" action="?/update_all" use:enhance={handleUpdateAll} class="hidden">
					<input type="hidden" name="banners" value={JSON.stringify(banners)} />
				</form>

				<div class="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
					{#if isSaving}
						<Loading
							variant="overlay"
							label="Menyimpan banner"
							description="Urutan dan status banner sedang diperbarui."
							class="rounded-2xl"
						/>
					{/if}
					<div class="p-5 border-b border-slate-100 flex items-center justify-between">
						<h3 class="font-bold text-slate-800">Daftar Banner</h3>
						<Button form="banners-update-form" type="submit" size="sm" disabled={isSaving || activeCount < 2 || activeCount > 5} class="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-5">
							{#if isSaving}
								<Loading label="Menyimpan..." size="sm" class="text-white" />
							{:else}
								Simpan Urutan & Status
							{/if}
						</Button>
					</div>
					
					<div class="p-0">
						{#if banners.length === 0}
							<div class="p-10 text-center text-slate-500">
								Belum ada banner yang diunggah.
							</div>
						{:else}
							<div class="flex flex-col">
								{#each banners as banner, index (banner.id)}
									<div class="flex items-center gap-4 p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
										
										<!-- Order Input -->
										<div class="flex flex-col items-center gap-1 w-12 shrink-0">
											<Label class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Urutan</Label>
											<Input 
												type="number" 
												bind:value={banner.display_order} 
												class="h-8 w-full text-center px-1 font-semibold text-slate-700 focus-visible:ring-primary" 
											/>
										</div>

										<!-- Thumbnail -->
										<div class="h-20 w-36 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
											<img src={getImageUrl(banner.image_url, { width: 360, height: 200, quality: 75, resize: 'cover' })} alt="Banner" class="w-full h-full object-cover" loading="lazy" decoding="async" />
										</div>

										<!-- Status Toggle -->
										<div class="flex-1 flex flex-col justify-center">
											<label class="flex items-center gap-2 cursor-pointer w-fit">
												<div class="relative inline-flex items-center">
													<input type="checkbox" bind:checked={banner.is_active} class="sr-only peer" />
													<div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
												</div>
												<span class="text-sm font-semibold {banner.is_active ? 'text-green-600' : 'text-slate-500'}">
													{banner.is_active ? 'Aktif' : 'Nonaktif'}
												</span>
											</label>
										</div>

										<!-- Actions -->
										<div class="shrink-0 flex items-center justify-end px-2">
											<form method="POST" action="?/delete" use:enhance={handleDelete}>
												<input type="hidden" name="id" value={banner.id} />
												<input type="hidden" name="image_url" value={banner.image_url} />
												<Button type="submit" variant="ghost" size="icon" class="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full h-9 w-9">
													<Trash2 class="h-4 w-4" />
												</Button>
											</form>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
