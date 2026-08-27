import { redirect } from '@sveltejs/kit';

export const load = async ({ url }) => {
	const queryString = url.searchParams.toString();
	throw redirect(307, `/order-form${queryString ? `?${queryString}` : ''}`);
};
