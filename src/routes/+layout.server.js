import { normalizeSiteInfo } from '$lib/site-info.js';
import { normalizeLocale } from '$lib/i18n.svelte.js';

export const load = async ({ locals: { supabase }, request, url }) => {
	const locale = normalizeLocale(request.headers.get('accept-language'));

	if (url.pathname.startsWith('/admin')) {
		return {
			locale,
			siteInfo: normalizeSiteInfo()
		};
	}

	const { data: siteInfo } = await supabase
		.from('site_contact_info')
		.select('*')
		.eq('id', 'main')
		.maybeSingle();

	return {
		locale,
		siteInfo: normalizeSiteInfo(siteInfo)
	};
};
