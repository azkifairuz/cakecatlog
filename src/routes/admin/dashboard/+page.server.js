export const load = async ({ locals: { supabase } }) => {
	const { data: orders, error } = await supabase
		.from('orders')
		.select(`
			*,
			order_items (
				*,
				products (
					name
				)
			)
		`)
		.order('created_at', { ascending: false });

	return {
		orders: orders ?? [],
	};
};

export const actions = {
	updateStatus: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const status = formData.get('status');

		if (!id || !status) return { success: false, error: 'Missing data' };

		const { error } = await supabase
			.from('orders')
			.update({ status })
			.eq('id', id);

		if (error) return { success: false, error: error.message };
		return { success: true };
	},
	updateAmount: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const amount = formData.get('amount');

		if (!id || !amount) return { success: false, error: 'Missing data' };

		const { error } = await supabase
			.from('orders')
			.update({ amount: parseFloat(amount) })
			.eq('id', id);

		if (error) return { success: false, error: error.message };
		return { success: true };
	},
	uploadReceipt: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const id = formData.get('id');
		const file = formData.get('receipt');

		if (!id || !file || file.size === 0) {
			return { success: false, error: 'Missing file or ID' };
		}

		// Upload to Supabase Storage
		const fileExt = file.name.split('.').pop();
		const fileName = `${id}-${Math.random()}.${fileExt}`;
		const filePath = `receipts/${fileName}`;

		const { error: uploadError } = await supabase.storage
			.from('products')
			.upload(filePath, file);

		if (uploadError) {
			return { success: false, error: uploadError.message };
		}

		const { data: publicUrlData } = supabase.storage
			.from('products')
			.getPublicUrl(filePath);

		const { error: updateError } = await supabase
			.from('orders')
			.update({ proof_of_transfer: publicUrlData.publicUrl })
			.eq('id', id);

		if (updateError) {
			return { success: false, error: updateError.message };
		}

		return { success: true };
	}
};
