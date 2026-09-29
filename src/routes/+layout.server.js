import { normalizeSiteInfo } from '$lib/site-info.js';
import { normalizeLocale } from '$lib/i18n.svelte.js';
import { getSiteInfo } from '$lib/api/public.js';

export const load = async ({ request, url, fetch }) => {
	const locale = normalizeLocale(request.headers.get('accept-language'));

	if (url.pathname.startsWith('/admin')) {
		return {
			locale,
			siteInfo: normalizeSiteInfo()
		};
	}

	const siteInfo = getSiteInfo(fetch)
		.then((data) => normalizeSiteInfo(data))
		.catch((error) => {
			console.error('Unable to load public site info:', error);
			return normalizeSiteInfo();
		});

	return {
		locale,
		siteInfo
	};
};
