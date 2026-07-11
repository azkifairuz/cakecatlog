<script>
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Clock, MapPin, MessageCircle, Save } from 'lucide-svelte';

	let { data, form } = $props();

	let saving = $state(false);
	let saved = $state(false);
	let currentInfo = $derived(form?.values ?? data.siteInfo);
</script>

<div class="mx-auto w-full max-w-5xl space-y-6">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<div class="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Footer User</div>
			<h1 class="mt-2 text-2xl font-bold text-[#4A3B32]">Info Toko</h1>
			<p class="mt-2 max-w-2xl text-sm leading-relaxed text-[#4A3B32]/70">
				Atur informasi pickup, alamat, dan WhatsApp yang muncul di footer halaman user.
			</p>
		</div>
	</div>

	{#if data.setupError}
		<div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
			<p class="font-bold">Tabel belum siap atau belum bisa dibaca.</p>
			<p class="mt-1">Jalankan SQL di <span class="font-semibold">supabase/site_contact_info.sql</span>, lalu refresh halaman ini.</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
			{form.error}
		</div>
	{/if}

	{#if saved}
		<div class="rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-medium text-green-700">
			Info toko berhasil disimpan.
		</div>
	{/if}

	<form
		method="POST"
		action="?/saveSiteInfo"
		use:enhance={() => {
			saving = true;
			saved = false;

			return async ({ update, result }) => {
				await update();
				saving = false;

				if (result.type === 'success') {
					saved = true;
					setTimeout(() => {
						saved = false;
					}, 3000);
				}
			};
		}}
		class="grid gap-6 lg:grid-cols-3"
	>
		<div class="space-y-4 rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFBF7] text-primary shadow-sm">
					<Clock class="h-5 w-5" />
				</div>
				<div>
					<h2 class="font-bold text-[#4A3B32]">Pickup</h2>
					<p class="text-xs text-[#4A3B32]/60">Jam dan hari pengambilan</p>
				</div>
			</div>

			<div class="grid gap-2">
				<Label for="pickup_days">Hari Pickup</Label>
				<Input id="pickup_days" name="pickup_days" required value={currentInfo.pickup_days} placeholder="MONDAY - SUNDAY" class="h-11 bg-slate-50" />
			</div>

			<div class="grid gap-2">
				<Label for="pickup_store_hours">Store Hours</Label>
				<Input id="pickup_store_hours" name="pickup_store_hours" value={currentInfo.pickup_store_hours} placeholder="Store Hours: 09:00 - 18:00" class="h-11 bg-slate-50" />
			</div>

			<div class="grid gap-2">
				<Label for="pickup_manager_hours">Manager Hours</Label>
				<Input id="pickup_manager_hours" name="pickup_manager_hours" value={currentInfo.pickup_manager_hours} placeholder="Manager Hours: 09:00 - 20:00" class="h-11 bg-slate-50" />
			</div>
		</div>

		<div class="space-y-4 rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFBF7] text-primary shadow-sm">
					<MapPin class="h-5 w-5" />
				</div>
				<div>
					<h2 class="font-bold text-[#4A3B32]">Alamat</h2>
					<p class="text-xs text-[#4A3B32]/60">Alamat yang tampil di footer</p>
				</div>
			</div>

			<div class="grid gap-2">
				<Label for="address">Alamat</Label>
				<Textarea id="address" name="address" required rows="8" value={currentInfo.address} placeholder="Nama jalan, area, nomor unit" class="min-h-44 resize-none bg-slate-50" />
				<p class="text-xs text-[#4A3B32]/60">Boleh beberapa baris, tampilannya akan ikut turun baris di footer.</p>
			</div>
		</div>

		<div class="space-y-4 rounded-xl border border-primary/10 bg-white p-5 shadow-sm">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFBF7] text-primary shadow-sm">
					<MessageCircle class="h-5 w-5" />
				</div>
				<div>
					<h2 class="font-bold text-[#4A3B32]">WhatsApp</h2>
					<p class="text-xs text-[#4A3B32]/60">Nomor kontak customer</p>
				</div>
			</div>

			<div class="grid gap-2">
				<Label for="whatsapp_number">Nomor WhatsApp</Label>
				<Input id="whatsapp_number" name="whatsapp_number" required value={currentInfo.whatsapp_number} placeholder="+62 812 3456 7890" class="h-11 bg-slate-50" />
				<p class="text-xs text-[#4A3B32]/60">Pakai kode negara agar tombol WhatsApp bisa langsung dibuka.</p>
			</div>
		</div>

		<div class="flex justify-end lg:col-span-3">
			<Button type="submit" disabled={saving} class="h-12 rounded-xl bg-primary px-6 font-bold text-white hover:bg-[#724828]">
				<Save class="h-4 w-4" />
				{saving ? 'Menyimpan...' : 'Simpan Info Toko'}
			</Button>
		</div>
	</form>
</div>
