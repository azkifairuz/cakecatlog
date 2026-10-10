import { fail } from '@sveltejs/kit';
import { adaptOrder } from '$lib/api/adapters.js';
import { uploadAdminOrderDeliveryProof, updateAdminOrderStatus } from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
import { DELIVERY_PROOF_FIELDS, validateProofFile, canonicalOrderStatus } from '$lib/order-delivery-proof.js';

export async function uploadDeliveryProofAction({ request, locals, fetch, cookies }) {
	const formData = await request.formData();
	const id = String(formData.get('id') || '');
	const status = canonicalOrderStatus(String(formData.get('status') || ''));
	const retryStatus = formData.get('retryStatus') === 'true';
	if (!id || (retryStatus && !status)) return fail(400, { success: false, error: 'Data pesanan tidak lengkap.' });
	let savedOrder = null;
	try {
		if (!retryStatus) {
			const files = {};
			for (const field of DELIVERY_PROOF_FIELDS) {
				const file = formData.get(field.name);
				const error = validateProofFile(file);
				if (error) return fail(400, { success: false, error: `${field.label}: ${error}` });
				files[field.name] = file;
			}
			savedOrder = await uploadAdminOrderDeliveryProof(id, files, locals.adminToken, fetch);
		}
		const updated = status ? await updateAdminOrderStatus(id, status, locals.adminToken, fetch) : savedOrder;
		return { success: true, order: adaptOrder(updated) };
	} catch (err) {
		handleAdminAuthError(err, cookies);
		return fail(err?.status >= 400 && err?.status < 500 ? err.status : 502, {
			success: false,
			error: err?.message || 'Gagal menyimpan bukti pengiriman.',
			proofUploaded: Boolean(savedOrder) || retryStatus,
			order: savedOrder ? adaptOrder(savedOrder) : null
		});
	}
}
