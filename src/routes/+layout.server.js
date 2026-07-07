import { normalizeSiteInfo } from '$lib/site-info.js';

export const load = async ({ locals: { supabase }, url }) => {
	if (url.pathname.startsWith('/admin')) {
		return {
			siteInfo: normalizeSiteInfo()
		};
	}

	const { data: siteInfo } = await supabase
		.from('site_contact_info')
		.select('*')
		.eq('id', 'main')
		.maybeSingle();

	return {
		siteInfo: normalizeSiteInfo(siteInfo)
	};
};
