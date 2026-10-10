import { fail } from '@sveltejs/kit';
import {
	getAdminWhatsAppQr,
	logoutAdminWhatsApp,
	getAdminInvoiceTemplate,
	updateAdminInvoiceTemplate,
	getAdminInvoiceTemplateVariables
} from '$lib/api/admin.js';
import { handleAdminAuthError } from '$lib/api/auth.js';
import {
	normalizeInvoiceTemplate,
	normalizeTemplateVariables,
	DEFAULT_INVOICE_TEMPLATE
} from '$lib/invoice-template.js';

function unavailableState(error) {
	return {
		status: 'error',
		qr: null,
		message: error?.message || 'Tidak dapat menghubungi WhatsApp gateway.'
	};
}

export async function load({ locals, fetch, cookies }) {
	const [whatsappResult, templateResult, variablesResult] = await Promise.allSettled([
		getAdminWhatsAppQr(locals.adminToken, fetch),
		getAdminInvoiceTemplate(locals.adminToken, fetch),
		getAdminInvoiceTemplateVariables(locals.adminToken, fetch)
	]);

	let whatsapp = { status: 'idle', qr: null, message: '' };
	if (whatsappResult.status === 'fulfilled') {
		whatsapp = whatsappResult.value || whatsapp;
	} else {
		handleAdminAuthError(whatsappResult.reason, cookies);
		console.error('WhatsApp QR state error:', whatsappResult.reason);
		whatsapp = unavailableState(whatsappResult.reason);
	}

	let template = DEFAULT_INVOICE_TEMPLATE;
	let templateLoadError = null;
	if (templateResult.status === 'fulfilled') {
		template = normalizeInvoiceTemplate(templateResult.value);
	} else {
		handleAdminAuthError(templateResult.reason, cookies);
		console.error('Invoice template load error:', templateResult.reason);
		templateLoadError = templateResult.reason?.message || 'Gagal memuat template dari server, menggunakan template standar.';
		template = normalizeInvoiceTemplate(null);
	}

	let variables = [];
	if (variablesResult.status === 'fulfilled') {
		variables = normalizeTemplateVariables(variablesResult.value);
	} else {
		handleAdminAuthError(variablesResult.reason, cookies);
		console.error('Invoice template variables load error:', variablesResult.reason);
		variables = normalizeTemplateVariables([]);
	}

	return {
		whatsapp,
		template,
		variables,
		templateLoadError
	};
}

export const actions = {
	logout: async ({ locals, fetch, cookies }) => {
		try {
			await logoutAdminWhatsApp(locals.adminToken, fetch);
			return { success: true };
		} catch (error) {
			handleAdminAuthError(error, cookies);
			console.error('WhatsApp logout error:', error);
			return fail(error?.status || 502, {
				success: false,
				message: unavailableState(error).message
			});
		}
	},

	saveTemplate: async ({ request, locals, fetch, cookies }) => {
		const formData = await request.formData();
		const messageTemplate = String(formData.get('messageTemplate') ?? '').trim();
		const itemTemplate = String(formData.get('itemTemplate') ?? '').trim();
		const emailSubjectTemplate = String(formData.get('emailSubjectTemplate') ?? '').trim();

		const payload = {
			messageTemplate,
			itemTemplate,
			emailSubjectTemplate
		};

		if (!messageTemplate) {
			return fail(400, {
				action: 'saveTemplate',
				templateError: 'Template pesan WhatsApp tidak boleh kosong.',
				values: payload
			});
		}

		if (!itemTemplate) {
			return fail(400, {
				action: 'saveTemplate',
				templateError: 'Template per item produk (itemTemplate) tidak boleh kosong.',
				values: payload
			});
		}

		try {
			const updated = await updateAdminInvoiceTemplate(payload, locals.adminToken, fetch);
			return {
				action: 'saveTemplate',
				templateSuccess: true,
				templateMessage: 'Template invoice berhasil disimpan.',
				updatedTemplate: normalizeInvoiceTemplate(updated || payload)
			};
		} catch (error) {
			handleAdminAuthError(error, cookies);
			console.error('Invoice template save error:', error);
			return fail(error?.status || 500, {
				action: 'saveTemplate',
				templateError: error.message || 'Gagal menyimpan template invoice ke server backend.',
				values: payload
			});
		}
	}
};
