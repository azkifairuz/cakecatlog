<script>
 import { enhance } from '$app/forms';
 import { Button } from '$lib/components/ui/button';
 import { Input } from '$lib/components/ui/input';
 import { Label } from '$lib/components/ui/label';
 let { form } = $props(); let busy = $state(false);
</script>
<svelte:head><title>Lupa Password | Dessert By Fir Admin</title></svelte:head>
<div class="mx-auto my-16 max-w-md space-y-5 rounded-xl border bg-background p-6">
 <h1 class="text-2xl font-semibold">Lupa password</h1><p class="text-sm text-muted-foreground">Kirim permintaan penggantian password kepada super admin.</p>
 {#if form?.error}<p role="alert" class="text-destructive">{form.error}</p>{/if}{#if form?.success}<p role="status">{form.message}</p>{/if}
 <form method="POST" class="space-y-4" use:enhance={() => { busy = true; return async ({ update }) => { try { await update(); } finally { busy = false; } }; }}>
 <Label for="identifier">Email atau username</Label><Input id="identifier" name="identifier" value={form?.identifier || ''} autocomplete="username" required maxlength={320} disabled={busy} /><Button type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim permintaan'}</Button>
 </form><a href="/admin/login" class="block text-sm underline">Kembali ke login</a>
</div>
