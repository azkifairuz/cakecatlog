import { error, redirect } from '@sveltejs/kit';
import { adminMenuUrl } from '$lib/admin-menu.js';

export const load = ({ params, url }) => {
	const target = adminMenuUrl(`/admin/${params.path}`);
	if (!target || target === url.pathname) error(404, 'Halaman tidak ditemukan');
	redirect(308, `${target}${url.search}`);
};
