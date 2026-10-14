import { fail } from '@sveltejs/kit';
import { requireAdminAccess } from '$lib/server/admin-access.js';
import { getPaymentAccounts, createPaymentAccount, updatePaymentAccount, deletePaymentAccount } from '$lib/api/payment-accounts.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
export async function load(event) {
 requireAdminAccess(event, 'order.write');
 try { return { accounts: await getPaymentAccounts(event.locals.adminToken, event.fetch), loadError: null }; }
 catch (err) { handleAdminAuthError(err, event.cookies); return { accounts: [], loadError: err.message || 'Gagal memuat rekening.' }; }
}
async function mutate(event, operation) {
 requireAdminAccess(event, 'order.write');
 const form = await event.request.formData();
 const values = { id: String(form.get('id') || ''), name: String(form.get('name') || '').trim(), norek: String(form.get('norek') || '').trim() };
 if (operation !== 'create' && !/^[0-9a-f-]{36}$/i.test(values.id)) return fail(422, { error: 'Rekening tidak valid.', values });
 if (operation === 'delete' && form.get('confirm') !== 'on') return fail(422, { error: 'Konfirmasi penghapusan rekening terlebih dahulu.' });
 if (operation !== 'delete' && (!values.name || !values.norek || values.name.length > 100 || values.norek.length > 100)) return fail(422, { error: 'Nama dan nomor rekening wajib diisi, maksimal 100 karakter.', values });
 try {
  const body = { name: values.name, norek: values.norek };
  if (operation === 'create') await createPaymentAccount(body, event.locals.adminToken, event.fetch);
  if (operation === 'update') await updatePaymentAccount(values.id, body, event.locals.adminToken, event.fetch);
  if (operation === 'delete') await deletePaymentAccount(values.id, event.locals.adminToken, event.fetch);
  return { success: true, message: operation === 'delete' ? 'Rekening dihapus.' : 'Rekening berhasil disimpan.' };
 } catch (err) { handleAdminAuthError(err, event.cookies); return fail(err.status || 500, { error: err.message || 'Gagal menyimpan rekening.', values }); }
}
export const actions = { create: (e) => mutate(e, 'create'), update: (e) => mutate(e, 'update'), delete: (e) => mutate(e, 'delete') };
