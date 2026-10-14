<script>
 import { enhance } from '$app/forms';
 import { Button } from '$lib/components/ui/button';
 import { Input } from '$lib/components/ui/input';
 import { Label } from '$lib/components/ui/label';
 import AdminPage from '$lib/components/admin/AdminPage.svelte';
 import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
 let { data, form } = $props(); let saving = $state(false);
</script>
<AdminPage class="max-w-2xl"><AdminPageHeader title="Akun Saya" description={`Ubah password akun ${data.username || ''}.`} />
 {#if form?.error}<p role="alert" class="rounded-xl border p-4 text-destructive">{form.error}</p>{/if}
 {#if form?.success}<p role="status" class="rounded-xl border p-4 text-emerald-700">{form.message}</p>{/if}
 <form method="POST" action="?/save" class="space-y-4 rounded-xl border bg-background p-5" use:enhance={({ cancel }) => { if(saving) { cancel(); return; } saving = true; return async ({ update }) => { try { await update({ reset: true, invalidateAll: false }); } finally { saving = false; } }; }}>
 <fieldset disabled={saving} class="space-y-4">
 <div class="space-y-2"><Label for="current">Password saat ini</Label><Input id="current" name="currentPassword" type="password" autocomplete="current-password" required maxlength={200} /></div>
 <div class="space-y-2"><Label for="new">Password baru</Label><Input id="new" name="newPassword" type="password" autocomplete="new-password" required minlength={8} maxlength={200} /></div>
 <div class="space-y-2"><Label for="confirm">Konfirmasi password baru</Label><Input id="confirm" name="confirmPassword" type="password" autocomplete="new-password" required minlength={8} maxlength={200} /></div>
 <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Ubah password'}</Button>
 </fieldset></form></AdminPage>
