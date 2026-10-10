<script>
	let { data, form } = $props();
	let editing = $state(null);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold">Pengaturan Menu</h1>
		<p class="text-sm text-muted-foreground">Kelola menu yang dikirim ke akun admin dan pilih menu untuk setiap role.</p>
	</div>
	{#if data.error}<p class="rounded-lg border border-destructive p-3 text-sm text-destructive">{data.error}</p>{/if}
	{#if form?.error}<p class="rounded-lg border border-destructive p-3 text-sm text-destructive">{form.error}</p>{/if}
	{#if form?.message}<p class="rounded-lg border p-3 text-sm">{form.message}</p>{/if}

	<section class="rounded-xl border bg-background p-4">
		<h2 class="mb-4 text-lg font-semibold">{editing ? 'Edit menu' : 'Tambah menu'}</h2>
		<form method="POST" action="?/save" class="grid gap-3 sm:grid-cols-2">
			<input type="hidden" name="id" value={editing?.id || ''} />
			<label class="grid gap-1 text-sm">Nama<input class="rounded-md border bg-background p-2" name="name" required value={editing?.name || ''} /></label>
			<label class="grid gap-1 text-sm">URL<input class="rounded-md border bg-background p-2" name="url" required pattern="/admin/.*" value={editing?.url || '/admin/dashboard/'} /></label>
			<label class="grid gap-1 text-sm">Icon Lucide<input class="rounded-md border bg-background p-2" name="icon" value={editing?.icon || 'Menu'} /></label>
			<label class="grid gap-1 text-sm">Urutan<input class="rounded-md border bg-background p-2" name="displayOrder" type="number" required value={editing?.displayOrder ?? 1} /></label>
			<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" checked={editing?.isActive !== false} /> Aktif</label>
			<div class="flex gap-2 sm:justify-end"><button class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" type="submit">Simpan</button>{#if editing}<button class="rounded-md border px-4 py-2 text-sm" type="button" onclick={() => editing = null}>Batal</button>{/if}</div>
		</form>
	</section>

	<section class="rounded-xl border bg-background p-4">
		<h2 class="mb-3 text-lg font-semibold">Daftar menu</h2>
		{#if !data.menus.length}<p class="text-sm text-muted-foreground">Belum ada menu di database. Navigasi sementara memakai daftar menu lokal.</p>{/if}
		<div class="divide-y">
			{#each data.menus as menu (menu.id)}
				<div class="flex flex-wrap items-center gap-2 py-3 text-sm">
					<div class="min-w-0 flex-1"><strong>{menu.name}</strong> <span class="text-muted-foreground">{menu.url} · {menu.icon} · urutan {menu.displayOrder} · {menu.isActive ? 'Aktif' : 'Nonaktif'}</span></div>
					<button type="button" class="rounded-md border px-3 py-1" onclick={() => editing = menu}>Edit</button>
					{#if menu.isActive}<form method="POST" action="?/remove"><input type="hidden" name="id" value={menu.id} /><button class="rounded-md border px-3 py-1" type="submit">Nonaktifkan</button></form>{/if}
				</div>
			{/each}
		</div>
	</section>

	<section class="rounded-xl border bg-background p-4">
		<h2 class="mb-3 text-lg font-semibold">Menu per role</h2>
		<form method="GET" class="mb-4"><label class="grid gap-1 text-sm">Pilih role<select name="role" class="rounded-md border bg-background p-2" onchange={(event) => event.currentTarget.form.requestSubmit()}><option value="">Pilih role</option>{#each data.roles as role}<option value={role.id} selected={data.roleId === role.id}>{role.name}</option>{/each}</select></label></form>
		{#if data.roleId}
			<form method="POST" action="?/roleMenus" class="space-y-3">
				<input type="hidden" name="roleId" value={data.roleId} />
				<div class="grid gap-2 sm:grid-cols-2">{#each data.menus.filter((menu) => menu.isActive) as menu}<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="menuIds" value={menu.id} checked={data.roleMenuIds.includes(menu.id)} />{menu.name}</label>{/each}</div>
				<button type="submit" class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Simpan menu role</button>
			</form>
		{/if}
	</section>
</div>
