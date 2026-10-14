<script>
 import { enhance } from '$app/forms';
 import { Button } from '$lib/components/ui/button';
 import { Input } from '$lib/components/ui/input';
 import { Label } from '$lib/components/ui/label';
 import AdminPage from '$lib/components/admin/AdminPage.svelte';
 import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
 import { copyInvoiceAccount } from '$lib/order-invoice.js';
 let { data, form } = $props();
 let editing = $state(null); let busy = $state(false); let copyMessage = $state('');
 function submit({ cancel }) { if (busy) { cancel(); return; } busy = true; return async ({ update, result }) => { try { await update({ reset: result.type === 'success' }); if (result.type === 'success') editing = null; } finally { busy = false; } }; }
 async function copy(account) { try { await copyInvoiceAccount(account.norek); copyMessage = `Nomor rekening ${account.name} disalin.`; } catch { copyMessage = 'Pilih nomor rekening dan salin secara manual.'; } }
</script>
<AdminPage class="max-w-4xl">
 <AdminPageHeader eyebrow="Pengaturan" title="Rekening Pembayaran" description="Kelola rekening yang ditampilkan pada invoice dan digunakan pelanggan untuk transfer." />
 {#if data.loadError}<p role="alert" class="rounded-xl border p-4 text-destructive">{data.loadError} <a href="/admin/dashboard/rekening-pembayaran" data-sveltekit-reload class="underline">Muat ulang</a></p>{/if}
 {#if form?.error}<p role="alert" class="rounded-xl border p-4 text-destructive">{form.error}</p>{/if}
 {#if form?.success}<p role="status" class="rounded-xl border p-4 text-emerald-700">{form.message}</p>{/if}
 {#if copyMessage}<p role="status" class="text-sm">{copyMessage}</p>{/if}
 <section class="rounded-xl border bg-background p-5">
 <h2 class="mb-4 font-semibold">{editing ? 'Edit rekening' : 'Tambah rekening'}</h2>
 {#key editing?.id ?? 'new'}
 <form method="POST" action={editing ? '?/update' : '?/create'} use:enhance={submit} class="space-y-4">
 <input type="hidden" name="id" value={editing?.id ?? ''} />
 <fieldset disabled={busy || !!data.loadError} class="grid gap-4 sm:grid-cols-2">
 <div class="space-y-2"><Label for="bank-name">Nama / label rekening</Label><Input id="bank-name" name="name" value={form?.values?.id === (editing?.id ?? '') ? form.values.name : editing?.name ?? ''} placeholder="BCA a/n Dessert By Fir" required maxlength={100} /></div>
 <div class="space-y-2"><Label for="bank-number">Nomor rekening</Label><Input id="bank-number" name="norek" type="text" value={form?.values?.id === (editing?.id ?? '') ? form.values.norek : editing?.norek ?? ''} required maxlength={100} /></div>
 <div class="flex gap-2 sm:col-span-2"><Button type="submit" disabled={busy || !!data.loadError}>{busy ? 'Menyimpan…' : 'Simpan rekening'}</Button>{#if editing}<Button type="button" variant="outline" onclick={() => editing = null} disabled={busy}>Batal</Button>{/if}</div>
 </fieldset></form>{/key}
 </section>
 <section class="space-y-3" aria-label="Daftar rekening">
 {#each data.accounts as account (account.id)}
 <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-5">
 <div><h2 class="font-semibold">{account.name}</h2><code class="select-all break-all">{account.norek}</code></div>
 <div class="flex flex-wrap gap-2"><Button variant="outline" onclick={() => copy(account)}>Salin</Button><Button variant="outline" disabled={busy} onclick={() => editing = account}>Edit</Button>
 <form method="POST" action="?/delete" use:enhance={(args) => { if (!confirm(`Hapus rekening ${account.name}? Rekening ini akan hilang dari daftar pembayaran invoice.`)) { args.cancel(); return; } return submit(args); }}><input type="hidden" name="id" value={account.id} /><input type="hidden" name="confirm" value="on" /><Button type="submit" variant="destructive" disabled={busy}>Hapus</Button></form></div>
 </div>{:else}{#if !data.loadError}<p class="rounded-xl border p-5 text-muted-foreground">Belum ada rekening pembayaran.</p>{/if}{/each}
 </section>
</AdminPage>
