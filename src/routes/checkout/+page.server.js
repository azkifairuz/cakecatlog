import { supabase } from '$lib/supabase';

export const actions = {
	checkout: async ({ request }) => {
		const formData = await request.formData();
		
		const customer_name = formData.get('customer_name');
		const phone_number = formData.get('phone_number');
		const address = formData.get('address');
		const delivery_date = formData.get('delivery_date');
		const delivery_time = formData.get('delivery_time');
		const total_price = formData.get('total_price');
		const cart_items_json = formData.get('cart_items');

		let cartItems = [];
		try {
			cartItems = JSON.parse(cart_items_json);
		} catch (e) {
			console.error('Failed to parse cart items', e);
			return { success: false, error: 'Data keranjang tidak valid' };
		}

		if (cartItems.length === 0) {
			return { success: false, error: 'Keranjang kosong' };
		}

		// 1. Insert Order
		const { data: orderData, error: orderError } = await supabase
			.from('orders')
			.insert({
				customer_name,
				phone_number,
				address,
				delivery_date,
				delivery_time,
				status: 'Pending',
				// Legacy fields to bypass RLS:
				product_id: cartItems[0].product_id,
				quantity: 1,
				cake_size: cartItems[0].cake_size || 'Custom',
				cake_flavor: cartItems[0].cake_flavor || '-',
				cake_color: cartItems[0].cake_color || null,
				crown_option: cartItems[0].crown_option || null,
				add_edible_glitter: cartItems[0].add_edible_glitter || null,
				cake_text: cartItems[0].cake_text || null,
				gift_card_text: cartItems[0].gift_card_text || null,
				reference_image_url: cartItems[0].reference_image_url || null,
				email: null,
				amount: parseFloat(total_price) || 0
			})
			.select('id')
			.single();

		if (orderError) {
			console.error('Order Error:', orderError);
			return { success: false, error: orderError.message };
		}

		const orderId = orderData.id;

		// 2. Insert Order Items
		const itemsToInsert = cartItems.map(item => ({
			order_id: orderId,
			product_id: item.product_id,
			quantity: item.quantity,
			cake_size: item.cake_size,
			cake_flavor: item.cake_flavor,
			cake_color: item.cake_color,
			crown_option: item.crown_option,
			add_edible_glitter: item.add_edible_glitter,
			cake_text: item.cake_text,
			gift_card_text: item.gift_card_text,
			reference_image_url: item.reference_image_url,
			price_at_order: item.price_at_order
		}));

		const { error: itemsError } = await supabase
			.from('order_items')
			.insert(itemsToInsert);

		if (itemsError) {
			console.error('Items Error:', itemsError);
			return { success: false, error: itemsError.message };
		}

		return { success: true, orderId };
	}
};
