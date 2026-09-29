import { redirect } from '@sveltejs/kit';

export const load = async ({ params }) => {
	throw redirect(307, `/order-form?product=${params.id}`);
};
