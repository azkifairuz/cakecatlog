import { error } from '@sveltejs/kit';
import { normalizeSiteInfo } from '$lib/site-info.js';

const receiptOrderSelect = `
	*,
	products (
		name
	),
	order_items (
		*,
		products (
			name
		)
	)
`;

export const load = async ({ params, locals: { supabase } }) => {
	const [{ data: order, error: orderError }, { data: siteInfo }] = await Promise.all([
		supabase.from('orders').select(receiptOrderSelect).eq('id', params.id).single(),
		supabase.from('site_contact_info').select('*').eq('id', 'main').maybeSingle()
	]);

	if (orderError || !order) {
		throw error(404, 'Order not found');
	}

	return {
		order,
		siteInfo: normalizeSiteInfo(siteInfo)
	};
};
