<script>
	import { enhance } from '$app/forms';
	import { fade, fly } from 'svelte/transition';
	import Users from '@lucide/svelte/icons/users';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Plus from '@lucide/svelte/icons/plus';
	import Edit from '@lucide/svelte/icons/edit';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Lock from '@lucide/svelte/icons/lock';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Mail from '@lucide/svelte/icons/mail';
	import User from '@lucide/svelte/icons/user';
	import Info from '@lucide/svelte/icons/info';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Loading from '$lib/components/Loading.svelte';
	import AdminPage from '$lib/components/admin/AdminPage.svelte';
	import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
	import AdminSearchField from '$lib/components/admin/AdminSearchField.svelte';
	import { createDebouncedValue } from '$lib/debounced-value.svelte.js';
	import AdminViewToggle from '$lib/components/admin/AdminViewToggle.svelte';
	import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
	import { getRoleBadgeMeta } from '$lib/employee-role-utils.js';
	import { cn } from '$lib/utils';

	let { data, form } = $props();

	// State
	let searchQuery = $state('');
	const getSettledSearch = createDebouncedValue(() => searchQuery);
	let selectedRoleFilter = $state('All');
	let viewMode = $state('list'); // 'list' (table) | 'card'

	// Drawer Create / Edit State
	let isDrawerOpen = $state(false);
	let editingEmployee = $state(null);
	let email = $state('');
	let username = $state('');
	let password = $state('');
	let selectedRoleId = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);

	// Reset Password Modal State
	let isResetModalOpen = $state(false);
	let resetTargetEmployee = $state(null);
	let newPassword = $state('');
	let showResetPassword = $state(false);
	let isResettingPassword = $state(false);

	let deletingId = $state(null);

	let employees = $derived(data.employees || []);
	let roles = $derived(data.roles || []);

	// Selectable roles (exclude super_admin for new assignment)
	let assignableRoles = $derived(
		roles.filter((r) => {
			const name = (r.name || '').toLowerCase();
			return name !== 'super_admin' && name !== 'superadmin';
		})
	);

	let roleOptions = $derived([
		{ value: 'All', label: 'Semua Role' },
		...roles.map((r) => ({ value: r.name, label: r.name }))
	]);

	let filteredEmployees = $derived(
		employees.filter((emp) => {
			const query = getSettledSearch().toLowerCase().trim();
			const matchesSearch =
				!query ||
				(emp.username || '').toLowerCase().includes(query) ||
				(emp.email || '').toLowerCase().includes(query) ||
				(emp.role || '').toLowerCase().includes(query);

			const matchesRole =
				selectedRoleFilter === 'All' ||
				(emp.role || '').toLowerCase() === selectedRoleFilter.toLowerCase();

			return matchesSearch && matchesRole;
		})
	);

	function openCreateDrawer() {
		editingEmployee = null;
		email = '';
		username = '';
		password = '';
		// Default to first available role or empty
		selectedRoleId = assignableRoles[0]?.id || '';
		showPassword = false;
		isDrawerOpen = true;
	}

	function openEditDrawer(employee) {
		editingEmployee = employee;
		email = employee.email || '';
		username = employee.username || '';
		password = '';
		selectedRoleId = employee.roleId || employee.role_id || '';
		showPassword = false;
		isDrawerOpen = true;
	}

	function closeDrawer() {
		isDrawerOpen = false;
		editingEmployee = null;
		email = '';
		username = '';
		password = '';
		selectedRoleId = '';
	}

	function openResetPasswordModal(employee) {
		resetTargetEmployee = employee;
		newPassword = '';
		showResetPassword = false;
		isResetModalOpen = true;
	}

	function closeResetPasswordModal() {
		isResetModalOpen = false;
		resetTargetEmployee = null;
		newPassword = '';
	}

	function formatDate(dateString) {
		if (!dateString) return '-';
		return new Date(dateString).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getInitials(name = '') {
		return name
			.split(/[\s_-]+/)
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() || 'U';
	}
</script>

<svelte:head>
	<title>Manajemen Karyawan | dessertbyfir Admin</title>
</svelte:head>

<AdminPage class="max-w-6xl">
	<AdminPageHeader
		eyebrow="Pengguna & Akses"
		title="Manajemen Karyawan"
		description="Kelola akun admin dan karyawan toko beserta penugasan role hak akses masing-masing."
	>
		{#snippet actions()}
			<div class="flex flex-wrap items-center gap-2">
				<a
					href="/admin/dashboard/roles"
					class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
				>
					<ShieldCheck class="size-3.5 text-primary" />
					<span>Kelola Role</span>
				</a>

				<Button
					type="button"
					onclick={openCreateDrawer}
					class="gap-1.5 transition-transform duration-150 active:scale-[0.98]"
				>
					<Plus class="size-4" />
					<span>Tambah Karyawan</span>
				</Button>
			</div>
		{/snippet}
	</AdminPageHeader>

	<!-- FORBIDDEN / PERMISSION ALERT -->
	{#if data.isForbidden}
		<Alert.Root variant="destructive" class="border-destructive/30 bg-destructive/5">
			<ShieldAlert class="size-5 text-destructive" />
			<Alert.Title class="text-base font-bold">Akses Ditolak (Super Admin Only)</Alert.Title>
			<Alert.Description class="text-sm">
				{data.error || 'Anda memerlukan hak akses admin.create (Super Admin) untuk mengelola data akun karyawan.'}
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

	<!-- FILTER & TOOLBAR -->
	<div class="flex flex-col items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-3.5 shadow-2xs sm:flex-row">
		<div class="flex flex-1 flex-col gap-2 w-full sm:flex-row sm:items-center">
			<div class="w-full sm:max-w-xs">
				<AdminSearchField
					bind:value={searchQuery}
					placeholder="Cari username, email..."
					label="Cari karyawan"
				/>
			</div>

			<!-- Role Filter Dropdown -->
			<div class="w-full sm:w-48">
				<select
					bind:value={selectedRoleFilter}
					class="h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 capitalize"
				>
					{#each roleOptions as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
			<span class="text-xs font-semibold text-muted-foreground">
				{filteredEmployees.length} Karyawan
			</span>
			<AdminViewToggle bind:value={viewMode} />
		</div>
	</div>

	<!-- MAIN CONTENT -->
	{#if filteredEmployees.length === 0}
		<AdminEmptyState
			title="Tidak Ada Karyawan Ditemukan"
			description={searchQuery || selectedRoleFilter !== 'All' ? 'Tidak ada akun karyawan yang cocok dengan filter pencarian.' : 'Belum ada akun karyawan yang terdaftar. Klik "+ Tambah Karyawan" untuk membuat akun baru.'}
		/>
	{:else if viewMode === 'list'}
		<!-- DATA TABLE VIEW -->
		<Card.Root class="overflow-hidden border-border/70 shadow-xs">
			<Table.Root>
				<Table.Header class="bg-muted/40">
					<Table.Row>
						<Table.Head class="w-56 text-xs font-bold">Karyawan</Table.Head>
						<Table.Head class="w-48 text-xs font-bold">Email</Table.Head>
						<Table.Head class="w-36 text-xs font-bold text-center">Role Akses</Table.Head>
						<Table.Head class="w-36 text-xs font-bold">Bergabung</Table.Head>
						<Table.Head class="w-32 text-right text-xs font-bold">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredEmployees as emp (emp.id || emp.username)}
						{@const badgeMeta = getRoleBadgeMeta(emp.role)}
						{@const isSuperAdmin = badgeMeta.isSuperAdmin}

						<Table.Row class="hover:bg-muted/30">
							<!-- User Avatar & Username -->
							<Table.Cell>
								<div class="flex items-center gap-2.5">
									<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary ring-1 ring-primary/20">
										{getInitials(emp.username)}
									</div>
									<div class="min-w-0">
										<div class="font-bold text-foreground truncate">{emp.username}</div>
										<div class="font-mono text-[10px] text-muted-foreground truncate">ID: {emp.id.slice(0, 8)}...</div>
									</div>
								</div>
							</Table.Cell>

							<!-- Email -->
							<Table.Cell class="text-xs text-foreground font-medium">
								<div class="flex items-center gap-1.5">
									<Mail class="size-3 text-muted-foreground shrink-0" />
									<span class="truncate">{emp.email}</span>
								</div>
							</Table.Cell>

							<!-- Role Badge -->
							<Table.Cell class="text-center">
								<span class={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold capitalize', badgeMeta.badgeClass)}>
									{badgeMeta.label}
								</span>
							</Table.Cell>

							<!-- Joined Date -->
							<Table.Cell class="text-xs text-muted-foreground">
								{formatDate(emp.createdAt || emp.created_at)}
							</Table.Cell>

							<!-- Actions -->
							<Table.Cell class="text-right">
								<div class="flex items-center justify-end gap-1">
									{#if !isSuperAdmin}
										<!-- Reset Password Button -->
										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="size-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
											title="Reset Password"
											onclick={() => openResetPasswordModal(emp)}
										>
											<KeyRound class="size-3.5" />
										</Button>

										<!-- Edit Button -->
										<Button
											type="button"
											variant="ghost"
											size="icon"
											class="size-8 text-foreground hover:bg-muted"
											title="Edit Data"
											onclick={() => openEditDrawer(emp)}
										>
											<Edit class="size-3.5" />
										</Button>

										<!-- Delete Button -->
										<form
											method="POST"
											action="?/deleteEmployee"
											use:enhance={() => {
												deletingId = emp.id;
												return async ({ update }) => {
													await update();
													deletingId = null;
												};
											}}
											onsubmit={(e) => {
												if (!confirm(`Hapus akun karyawan "${emp.username}" (${emp.email})?`)) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="id" value={emp.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon"
												disabled={deletingId === emp.id}
												class="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
												title="Hapus Karyawan"
											>
												{#if deletingId === emp.id}
													<Loading label="" size="sm" />
												{:else}
													<Trash2 class="size-3.5" />
												{/if}
											</Button>
										</form>
									{:else}
										<span class="text-[11px] font-medium text-muted-foreground">Terlindungi</span>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	{:else}
		<!-- CARD VIEW -->
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredEmployees as emp (emp.id || emp.username)}
				{@const badgeMeta = getRoleBadgeMeta(emp.role)}
				{@const isSuperAdmin = badgeMeta.isSuperAdmin}

				<Card.Root class="group relative flex flex-col justify-between border-border/70 shadow-2xs transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
					<Card.Header class="pb-3">
						<div class="flex items-start justify-between gap-3">
							<div class="flex items-center gap-3 min-w-0">
								<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-sm text-primary ring-1 ring-primary/20">
									{getInitials(emp.username)}
								</div>
								<div class="min-w-0">
									<h3 class="font-bold text-foreground truncate leading-tight">{emp.username}</h3>
									<p class="text-xs text-muted-foreground truncate">{emp.email}</p>
								</div>
							</div>
						</div>
					</Card.Header>

					<Card.Content class="space-y-3 pt-0">
						<div class="flex items-center justify-between gap-2 rounded-xl bg-muted/30 p-2.5 border border-border/50">
							<span class="text-xs font-semibold text-muted-foreground">Role:</span>
							<span class={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold capitalize', badgeMeta.badgeClass)}>
								{badgeMeta.label}
							</span>
						</div>
					</Card.Content>

					<Card.Footer class="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
						<span class="text-[11px]">Bergabung: {formatDate(emp.createdAt || emp.created_at)}</span>

						<div class="flex items-center gap-1">
							{#if !isSuperAdmin}
								<Button
									type="button"
									variant="outline"
									size="sm"
									class="h-8 gap-1 px-2 text-xs"
									onclick={() => openResetPasswordModal(emp)}
									title="Reset Password"
								>
									<KeyRound class="size-3 text-amber-600" />
									<span>Reset</span>
								</Button>

								<Button
									type="button"
									variant="outline"
									size="sm"
									class="h-8 gap-1 px-2 text-xs"
									onclick={() => openEditDrawer(emp)}
									title="Edit"
								>
									<Edit class="size-3" />
									<span>Edit</span>
								</Button>

								<form
									method="POST"
									action="?/deleteEmployee"
									use:enhance={() => {
										deletingId = emp.id;
										return async ({ update }) => {
											await update();
											deletingId = null;
										};
									}}
									onsubmit={(e) => {
										if (!confirm(`Hapus akun karyawan "${emp.username}"?`)) e.preventDefault();
									}}
								>
									<input type="hidden" name="id" value={emp.id} />
									<Button
										type="submit"
										variant="ghost"
										size="icon"
										disabled={deletingId === emp.id}
										class="size-8 text-destructive hover:bg-destructive/10"
									>
										{#if deletingId === emp.id}
											<Loading label="" size="sm" />
										{:else}
											<Trash2 class="size-3.5" />
										{/if}
									</Button>
								</form>
							{:else}
								<span class="text-[11px] font-medium text-muted-foreground">Akun Utama</span>
							{/if}
						</div>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</AdminPage>

<!-- DRAWER TAMBAH / EDIT KARYAWAN -->
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
			class="relative mx-auto flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-card p-6 shadow-2xl pb-safe-10 border-t border-border"
			transition:fly={{ y: '100%', duration: 320, opacity: 1, easing: (t) => 1 - Math.pow(1 - t, 4) }}
		>
			{#if isSubmitting}
				<Loading
					variant="overlay"
					label={editingEmployee ? 'Memperbarui data karyawan...' : 'Membuat akun karyawan...'}
					description="Mohon tunggu, data sedang diverifikasi dan disimpan."
					class="rounded-t-3xl"
				/>
			{/if}

			<div class="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"></div>

			<div class="mb-5 flex items-start justify-between shrink-0">
				<div>
					<h3 class="text-xl font-bold text-foreground">
						{editingEmployee ? `Edit Karyawan: ${editingEmployee.username}` : 'Tambah Karyawan Baru'}
					</h3>
					<p class="text-xs text-muted-foreground">
						{editingEmployee ? 'Perbarui informasi akun dan penugasan role.' : 'Daftarkan akun admin baru untuk staf atau kasir toko.'}
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
					action={editingEmployee ? '?/updateEmployee' : '?/createEmployee'}
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
					class="space-y-4"
				>
					{#if editingEmployee}
						<input type="hidden" name="id" value={editingEmployee.id} />
					{/if}

					<!-- EMAIL -->
					<div class="space-y-1.5">
						<Label for="emp_email" class="font-bold text-foreground">Email</Label>
						<Input
							id="emp_email"
							name="email"
							type="email"
							bind:value={email}
							placeholder="staff@dessertbyfir.com"
							required
							class="h-11 rounded-xl"
						/>
					</div>

					<!-- USERNAME -->
					<div class="space-y-1.5">
						<Label for="emp_username" class="font-bold text-foreground">Username</Label>
						<Input
							id="emp_username"
							name="username"
							type="text"
							bind:value={username}
							placeholder="staff_order"
							required
							minlength="3"
							class="h-11 rounded-xl"
						/>
						<p class="text-[11px] text-muted-foreground">Minimal 3 karakter untuk login.</p>
					</div>

					<!-- PASSWORD (ONLY FOR CREATE) -->
					{#if !editingEmployee}
						<div class="space-y-1.5">
							<Label for="emp_password" class="font-bold text-foreground">Password Awal</Label>
							<div class="relative">
								<Input
									id="emp_password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									bind:value={password}
									placeholder="Minimal 8 karakter"
									required
									minlength="8"
									class="h-11 pr-10 rounded-xl"
								/>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
								>
									{#if showPassword}
										<EyeOff class="size-4" />
									{:else}
										<Eye class="size-4" />
									{/if}
								</button>
							</div>
							<p class="text-[11px] text-muted-foreground">Password dapat di-reset kapan saja nanti.</p>
						</div>
					{/if}

					<!-- ROLE SELECTION (DYNAMIC FROM GET /admin/roles) -->
					<div class="space-y-1.5 pt-1">
						<div class="flex items-center justify-between">
							<Label for="emp_role" class="font-bold text-foreground">Role Akses</Label>
							<a href="/admin/dashboard/roles" class="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1">
								<span>Kelola Role</span>
								<ExternalLink class="size-3" />
							</a>
						</div>

						<select
							id="emp_role"
							name="roleId"
							bind:value={selectedRoleId}
							class="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 capitalize"
						>
							<option value="">-- Pilih Role (Default: Admin) --</option>
							{#each assignableRoles as r}
								<option value={r.id}>{r.name} ({r.permissions?.length || 0} permission)</option>
							{/each}
						</select>
						<p class="text-[11px] text-muted-foreground">
							Hak akses dan menu yang dapat diakses karyawan akan mengikuti permission role ini.
						</p>
					</div>

					<!-- SUBMIT BUTTON -->
					<div class="pt-4 sticky bottom-0 bg-card">
						<Button
							type="submit"
							disabled={isSubmitting || !email.trim() || !username.trim() || (!editingEmployee && password.length < 8)}
							class="w-full h-11 font-bold text-sm"
						>
							{#if isSubmitting}
								<Loading label="Menyimpan..." size="sm" class="text-primary-foreground" />
							{:else}
								{editingEmployee ? 'Simpan Perubahan Karyawan' : 'Buat Akun Karyawan'}
							{/if}
						</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- RESET PASSWORD MODAL -->
{#if isResetModalOpen && resetTargetEmployee}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			type="button"
			class="fixed inset-0 size-full bg-slate-900/40 backdrop-blur-xs cursor-default"
			transition:fade={{ duration: 150 }}
			onclick={closeResetPasswordModal}
			aria-label="Tutup modal"
		></button>

		<div
			class="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl z-10"
			transition:fly={{ y: 20, duration: 200 }}
		>
			{#if isResettingPassword}
				<Loading
					variant="overlay"
					label="Mereset password..."
					description="Password baru sedang diperbarui."
					class="rounded-2xl"
				/>
			{/if}

			<div class="flex items-start gap-3">
				<div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
					<KeyRound class="size-5" />
				</div>
				<div class="min-w-0 flex-1">
					<h3 class="text-lg font-bold text-foreground">Reset Password Karyawan</h3>
					<p class="mt-0.5 text-xs text-muted-foreground">
						Akun: <strong>{resetTargetEmployee.username}</strong> ({resetTargetEmployee.email})
					</p>
				</div>
			</div>

			<form
				method="POST"
				action="?/resetPassword"
				use:enhance={() => {
					isResettingPassword = true;
					return async ({ update, result }) => {
						try {
							await update();
							if (result.type === 'success') {
								closeResetPasswordModal();
							}
						} finally {
							isResettingPassword = false;
						}
					};
				}}
				class="mt-5 space-y-4"
			>
				<input type="hidden" name="id" value={resetTargetEmployee.id} />

				<div class="space-y-1.5">
					<Label for="new_password" class="font-bold text-foreground">Password Baru</Label>
					<div class="relative">
						<Input
							id="new_password"
							name="newPassword"
							type={showResetPassword ? 'text' : 'password'}
							bind:value={newPassword}
							placeholder="Minimal 8 karakter"
							required
							minlength="8"
							class="h-11 pr-10 rounded-xl"
						/>
						<button
							type="button"
							onclick={() => (showResetPassword = !showResetPassword)}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
							aria-label={showResetPassword ? 'Sembunyikan password' : 'Lihat password'}
						>
							{#if showResetPassword}
								<EyeOff class="size-4" />
							{:else}
								<Eye class="size-4" />
							{/if}
						</button>
					</div>
					<p class="text-[11px] text-muted-foreground">
						Pastikan memberitahukan password baru ini kepada karyawan bersangkutan.
					</p>
				</div>

				<div class="flex items-center justify-end gap-2 pt-2">
					<Button
						type="button"
						variant="outline"
						onclick={closeResetPasswordModal}
						class="h-10"
					>
						Batal
					</Button>
					<Button
						type="submit"
						disabled={isResettingPassword || newPassword.length < 8}
						class="h-10 font-bold"
					>
						{#if isResettingPassword}
							<Loading label="Menyimpan..." size="sm" class="text-primary-foreground" />
						{:else}
							Simpan Password Baru
						{/if}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
