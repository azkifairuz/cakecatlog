<script>
	import { enhance } from '$app/forms';
	import { fade, fly } from 'svelte/transition';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Users from '@lucide/svelte/icons/users';
	import Lock from '@lucide/svelte/icons/lock';
	import Plus from '@lucide/svelte/icons/plus';
	import Edit from '@lucide/svelte/icons/edit';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import CheckSquare from '@lucide/svelte/icons/check-square';
	import Square from '@lucide/svelte/icons/square';
	import Info from '@lucide/svelte/icons/info';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Loading from '$lib/components/Loading.svelte';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminSearchField from '$lib/components/admin/AdminSearchField.svelte';
	import { createDebouncedValue } from '$lib/debounced-value.svelte.js';
	import AdminViewToggle from '$lib/components/admin/AdminViewToggle.svelte';
	import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
	import { groupPermissionsByCategory, getRoleBadgeMeta } from '$lib/employee-role-utils.js';
	import { cn } from '$lib/utils';

	let { data, form } = $props();

	// State
	let searchQuery = $state('');
	const getSettledSearch = createDebouncedValue(() => searchQuery);
	let viewMode = $state('card'); // 'card' | 'list'
	let isDrawerOpen = $state(false);
	let editingRole = $state(null);
	let roleName = $state('');
	let selectedPermissionKeys = $state([]);
	let isSubmitting = $state(false);
	let deletingId = $state(null);

	let roles = $derived(data.roles || []);
	let permissions = $derived(data.permissions || []);
	let groupedPermissions = $derived(groupPermissionsByCategory(permissions));

	let filteredRoles = $derived(
		roles.filter((role) => {
			const q = getSettledSearch().toLowerCase().trim();
			if (!q) return true;
			return (
				(role.name || '').toLowerCase().includes(q) ||
				(role.permissions || []).some((p) => (p.key || p.name || '').toLowerCase().includes(q))
			);
		})
	);

	function openCreateDrawer() {
		editingRole = null;
		roleName = '';
		selectedPermissionKeys = [];
		isDrawerOpen = true;
	}

	function openEditDrawer(role) {
		editingRole = role;
		roleName = role.name || '';
		selectedPermissionKeys = (role.permissions || []).map((p) => p.key || p.id || p);
		isDrawerOpen = true;
	}

	function closeDrawer() {
		isDrawerOpen = false;
		editingRole = null;
		roleName = '';
		selectedPermissionKeys = [];
	}

	function togglePermission(key) {
		if (selectedPermissionKeys.includes(key)) {
			selectedPermissionKeys = selectedPermissionKeys.filter((k) => k !== key);
		} else {
			selectedPermissionKeys = [...selectedPermissionKeys, key];
		}
	}

	function toggleCategoryAll(group) {
		const groupKeys = group.permissions.map((p) => p.key);
		const allSelected = groupKeys.every((k) => selectedPermissionKeys.includes(k));

		if (allSelected) {
			selectedPermissionKeys = selectedPermissionKeys.filter((k) => !groupKeys.includes(k));
		} else {
			selectedPermissionKeys = Array.from(new Set([...selectedPermissionKeys, ...groupKeys]));
		}
	}

	function toggleSelectAllGlobal() {
		const allKeys = permissions.map((p) => p.key);
		if (selectedPermissionKeys.length === allKeys.length) {
			selectedPermissionKeys = [];
		} else {
			selectedPermissionKeys = [...allKeys];
		}
	}

	function formatDate(dateString) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Role & Hak Akses | dessertbyfir Admin</title>
</svelte:head>

<AdminPage class="max-w-6xl">
	<AdminPageHeader
		eyebrow="Otorisasi & Keamanan"
		title="Role & Hak Akses"
		description="Kelola role dan konfigurasi hak akses (permission) untuk karyawan toko."
	>
		{#snippet actions()}
			<div class="flex items-center gap-2">
				<Button
					type="button"
					onclick={openCreateDrawer}
					class="gap-1.5 transition-transform duration-150 active:scale-[0.98]"
				>
					<Plus class="size-4" />
					<span>Tambah Role</span>
				</Button>
			</div>
		{/snippet}
	</AdminPageHeader>

	<!-- FORBIDDEN / PERMISSION ALERT -->
	{#if data.isForbidden}
		<Alert.Root variant="destructive" class="border-destructive/30 bg-destructive/5">
			<ShieldAlert class="size-5 text-destructive" />
			<Alert.Title class="text-base font-bold">Akses Ditolak</Alert.Title>
			<Alert.Description class="text-sm">
				{data.error || 'Anda memerlukan hak akses role.manage (Super Admin) untuk mengelola data role.'}
			</Alert.Description>
		</Alert.Root>
	{:else if data.error || form?.error}
		<Alert.Root variant="destructive">
			<Info class="size-4" />
			<Alert.Title>Pemberitahuan</Alert.Title>
			<Alert.Description class="text-xs">{data.error || form?.error}</Alert.Description>
		</Alert.Root>
	{/if}

	{#if form?.success && form?.message}
		<div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in duration-200">
			✓ {form.message}
		</div>
	{/if}

	<!-- FILTER & VIEW TOOLBAR -->
	<div class="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-2xs sm:flex-row">
		<div class="w-full flex-1 sm:max-w-md">
			<AdminSearchField
				bind:value={searchQuery}
				placeholder="Cari nama role atau permission..."
				label="Cari role"
			/>
		</div>
		<div class="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
			<span class="text-xs font-semibold text-muted-foreground">
				{filteredRoles.length} Role
			</span>
			<AdminViewToggle bind:value={viewMode} />
		</div>
	</div>

	<!-- MAIN CONTENT -->
	{#if filteredRoles.length === 0}
		<AdminEmptyState
			title="Tidak Ada Role Ditemukan"
			description={searchQuery ? 'Tidak ada role yang cocok dengan pencarian.' : 'Belum ada role yang ditambahkan. Klik tombol "Tambah Role" untuk mulai membuat role karyawan.'}
		/>
	{:else if viewMode === 'card'}
		<!-- CARD VIEW -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredRoles as role (role.id || role.name)}
				{@const badgeMeta = getRoleBadgeMeta(role.name)}
				{@const isSuperAdmin = badgeMeta.isSuperAdmin}
				{@const userCount = role.usersCount ?? role.users_count ?? 0}
				{@const perms = role.permissions || []}

				<Card.Root class="group relative flex flex-col justify-between border-border/70 shadow-2xs transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<h3 class="text-lg font-bold capitalize text-foreground">{role.name}</h3>
									{#if isSuperAdmin}
										<span class="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 border border-purple-200" title="Role sistem terlindungi">
											<Lock class="size-2.5" /> Sistem
										</span>
									{/if}
								</div>
								<p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
									<Users class="size-3 text-muted-foreground" />
									<span><strong>{userCount}</strong> karyawan menggunakan role ini</span>
								</p>
							</div>
						</div>
					</Card.Header>

					<Card.Content class="flex-1 space-y-3 pt-0">
						<div>
							<span class="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Hak Akses ({perms.length})</span>
							<div class="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
								{#each perms as p}
									<span class="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground">
										{p.key || p.name || p}
									</span>
								{:else}
									<span class="text-xs italic text-muted-foreground">Tidak ada permission khusus.</span>
								{/each}
							</div>
						</div>
					</Card.Content>

					<Card.Footer class="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
						<span class="text-[11px]">Dibuat: {formatDate(role.createdAt || role.created_at)}</span>

						<div class="flex items-center gap-1.5">
							{#if !isSuperAdmin}
								<Button
									type="button"
									variant="outline"
									size="sm"
									class="h-8 gap-1 px-2.5 text-xs transition-transform duration-150 active:scale-[0.98]"
									onclick={() => openEditDrawer(role)}
								>
									<Edit class="size-3.5" /> Edit
								</Button>

								<form
									method="POST"
									action="?/deleteRole"
									use:enhance={() => {
										deletingId = role.id;
										return async ({ update }) => {
											await update();
											deletingId = null;
										};
									}}
									onsubmit={(e) => {
										if (userCount > 0) {
											alert(`Role "${role.name}" masih digunakan oleh ${userCount} karyawan. Ganti role karyawan terlebih dahulu sebelum menghapus role ini.`);
											e.preventDefault();
											return;
										}
										if (!confirm(`Apakah Anda yakin ingin menghapus role "${role.name}"?`)) {
											e.preventDefault();
										}
									}}
								>
									<input type="hidden" name="id" value={role.id} />
									<Button
										type="submit"
										variant="ghost"
										size="icon"
										disabled={deletingId === role.id || userCount > 0}
										class="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
										title={userCount > 0 ? 'Role masih digunakan karyawan' : 'Hapus role'}
									>
										{#if deletingId === role.id}
											<Loading label="" size="sm" />
										{:else}
											<Trash2 class="size-3.5" />
										{/if}
									</Button>
								</form>
							{:else}
								<span class="text-[11px] font-medium text-muted-foreground">Read-only</span>
							{/if}
						</div>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<!-- TABLE VIEW -->
		<Card.Root class="overflow-hidden border-border/70 shadow-xs">
			<Table.Root>
				<Table.Header class="bg-muted/40">
					<Table.Row>
						<Table.Head class="w-48 text-xs font-bold">Nama Role</Table.Head>
						<Table.Head class="w-32 text-xs font-bold text-center">Pengguna</Table.Head>
						<Table.Head class="text-xs font-bold">Hak Akses / Permission</Table.Head>
						<Table.Head class="w-36 text-xs font-bold">Dibuat</Table.Head>
						<Table.Head class="w-28 text-right text-xs font-bold">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredRoles as role (role.id || role.name)}
						{@const badgeMeta = getRoleBadgeMeta(role.name)}
						{@const isSuperAdmin = badgeMeta.isSuperAdmin}
						{@const userCount = role.usersCount ?? role.users_count ?? 0}
						{@const perms = role.permissions || []}

						<Table.Row class="hover:bg-muted/30">
							<Table.Cell class="font-bold text-foreground capitalize">
								<div class="flex items-center gap-2">
									<span>{role.name}</span>
									{#if isSuperAdmin}
										<span class="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-800">
											<Lock class="size-2.5" /> Sistem
										</span>
									{/if}
								</div>
							</Table.Cell>

							<Table.Cell class="text-center font-semibold text-foreground">
								<span class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
									<Users class="size-3 text-muted-foreground" />
									{userCount}
								</span>
							</Table.Cell>

							<Table.Cell>
								<div class="flex flex-wrap gap-1">
									{#each perms.slice(0, 4) as p}
										<span class="inline-flex rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
											{p.key || p.name || p}
										</span>
									{/each}
									{#if perms.length > 4}
										<span class="inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
											+{perms.length - 4} lainnya
										</span>
									{/if}
									{#if perms.length === 0}
										<span class="text-xs text-muted-foreground">-</span>
									{/if}
								</div>
							</Table.Cell>

							<Table.Cell class="text-xs text-muted-foreground">
								{formatDate(role.createdAt || role.created_at)}
							</Table.Cell>

							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									{#if !isSuperAdmin}
										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="size-8"
											onclick={() => openEditDrawer(role)}
											title="Edit role"
										>
											<Edit class="size-3.5" />
										</Button>

										<form
											method="POST"
											action="?/deleteRole"
											use:enhance={() => {
												deletingId = role.id;
												return async ({ update }) => {
													await update();
													deletingId = null;
												};
											}}
											onsubmit={(e) => {
												if (userCount > 0) {
													alert(`Role "${role.name}" masih digunakan oleh ${userCount} karyawan.`);
													e.preventDefault();
													return;
												}
												if (!confirm(`Hapus role "${role.name}"?`)) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="id" value={role.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon"
												disabled={deletingId === role.id || userCount > 0}
												class="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
												title="Hapus role"
											>
												<Trash2 class="size-3.5" />
											</Button>
										</form>
									{:else}
										<span class="text-[11px] text-muted-foreground">-</span>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	{/if}
</AdminPage>

<!-- CREATE / EDIT ROLE DRAWER -->
{#if isDrawerOpen}
	<div class="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
		<button
			type="button"
			class="absolute inset-0 size-full bg-slate-900/40 backdrop-blur-xs cursor-default"
			transition:fade={{ duration: 200 }}
			onclick={closeDrawer}
			aria-label="Tutup drawer"
		></button>

		<div
			class="relative mx-auto flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl bg-card p-6 shadow-2xl pb-safe-10 border-t border-border"
			transition:fly={{ y: '100%', duration: 320, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}
		>
			{#if isSubmitting}
				<Loading
					variant="overlay"
					label={editingRole ? 'Memperbarui role...' : 'Membuat role baru...'}
					description="Mohon tunggu, konfigurasi hak akses sedang disimpan."
					class="rounded-t-3xl"
				/>
			{/if}

			<div class="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"></div>

			<div class="mb-5 flex items-start justify-between shrink-0">
				<div>
					<h3 class="text-xl font-bold text-foreground">
						{editingRole ? `Edit Role: ${editingRole.name}` : 'Tambah Role Baru'}
					</h3>
					<p class="text-xs text-muted-foreground">
						Tentukan nama role dan pilih hak akses modul yang diperbolehkan.
					</p>
				</div>
				<button
					type="button"
					onclick={closeDrawer}
					class="rounded-full bg-muted p-2 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
					aria-label="Tutup"
				>
					✕
				</button>
			</div>

			<div class="flex-1 overflow-y-auto pr-1">
				<form
					method="POST"
					action={editingRole ? '?/updateRole' : '?/createRole'}
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update, result }) => {
							try {
								await update();
								if (result.type === 'success') {
									closeDrawer();
								}
							} finally {
								isSubmitting = false;
							}
						};
					}}
					class="space-y-5"
				>
					{#if editingRole}
						<input type="hidden" name="id" value={editingRole.id} />
					{/if}

					<!-- ROLE NAME -->
					<div class="space-y-1.5">
						<Label for="role_name" class="font-bold text-foreground">Nama Role</Label>
						<Input
							id="role_name"
							name="name"
							type="text"
							bind:value={roleName}
							placeholder="Contoh: cashier, kitchen_staff, inventory_manager"
							required
							class="h-11 rounded-xl"
						/>
						<p class="text-[11px] text-muted-foreground">
							Nama unik untuk mengidentifikasi role karyawan (misal: <code>cashier</code>, <code>kitchen</code>).
						</p>
					</div>

					<!-- PERMISSIONS HEADER -->
					<div class="space-y-3 pt-2">
						<div class="flex items-center justify-between border-b border-border/70 pb-2">
							<div>
								<h4 class="text-sm font-bold text-foreground">Daftar Hak Akses (Permissions)</h4>
								<p class="text-[11px] text-muted-foreground">
									Dipilih: <strong>{selectedPermissionKeys.length}</strong> dari {permissions.length} permission
								</p>
							</div>

							<Button
								type="button"
								variant="outline"
								size="sm"
								class="h-8 text-xs"
								onclick={toggleSelectAllGlobal}
							>
								{selectedPermissionKeys.length === permissions.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
							</Button>
						</div>

						<!-- PERMISSIONS GROUPED -->
						<div class="space-y-4">
							{#each groupedPermissions as group}
								{@const groupKeys = group.permissions.map((p) => p.key)}
								{@const isAllGroupSelected = groupKeys.length > 0 && groupKeys.every((k) => selectedPermissionKeys.includes(k))}

								<div class="rounded-xl border border-border/80 bg-muted/20 p-3.5">
									<div class="flex items-center justify-between border-b border-border/50 pb-2">
										<span class="text-xs font-bold text-foreground">{group.label}</span>
										<button
											type="button"
											onclick={() => toggleCategoryAll(group)}
											class="text-[11px] font-semibold text-primary hover:underline"
										>
											{isAllGroupSelected ? 'Batal Semua' : 'Pilih Semua'}
										</button>
									</div>

									<div class="mt-3 grid gap-2 sm:grid-cols-2">
										{#each group.permissions as perm}
											{@const isChecked = selectedPermissionKeys.includes(perm.key)}
											<label
												class={cn(
													'flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-colors cursor-pointer',
													isChecked
														? 'border-primary/50 bg-primary/5 text-foreground font-semibold'
														: 'border-border/60 bg-background text-muted-foreground hover:bg-muted/40'
												)}
											>
												<input
													type="checkbox"
													name="permissionKeys"
													value={perm.key}
													checked={isChecked}
													onchange={() => togglePermission(perm.key)}
													class="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
												/>
												<div class="min-w-0 flex-1">
													<div class="font-medium text-foreground">{perm.name}</div>
													<div class="font-mono text-[10px] text-muted-foreground">{perm.key}</div>
												</div>
											</label>
										{/each}
									</div>
								</div>
							{:else}
								<div class="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
									Daftar permission belum tersedia dari server.
								</div>
							{/each}
						</div>
					</div>

					<!-- SUBMIT BUTTON -->
					<div class="sticky bottom-0 bg-card pt-3 border-t border-border">
						<Button
							type="submit"
							disabled={isSubmitting || !roleName.trim()}
							class="w-full h-11 font-bold text-sm"
						>
							{#if isSubmitting}
								<Loading label="Menyimpan..." size="sm" class="text-primary-foreground" />
							{:else}
								{editingRole ? 'Simpan Perubahan Role' : 'Buat Role Baru'}
							{/if}
						</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
