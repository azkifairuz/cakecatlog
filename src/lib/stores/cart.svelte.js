import { browser } from '$app/environment';

class CartStore {
	items = $state([]);
	isOpen = $state(false);

	constructor() {
		if (browser) {
			const stored = localStorage.getItem('cake_cart');
			if (stored) {
				try {
					this.items = JSON.parse(stored);
				} catch (e) {
					console.error('Failed to parse cart', e);
				}
			}
		}
	}

	save() {
		if (browser) {
			localStorage.setItem('cake_cart', JSON.stringify(this.items));
		}
	}

	addItem(item) {
		// Generate unique ID for cart item
		const cartItemId = crypto.randomUUID();
		this.items = [...this.items, { ...item, cartItemId }];
		this.save();
		this.isOpen = true; // open drawer when item is added
	}

	removeItem(cartItemId) {
		this.items = this.items.filter(i => i.cartItemId !== cartItemId);
		this.save();
	}

	clear() {
		this.items = [];
		this.save();
	}

	get totalItems() {
		return this.items.length;
	}

	get totalPrice() {
		return this.items.reduce((sum, item) => {
			const unitPrice = item.estimated_unit_price || item.price_at_order || 0;
			return sum + (unitPrice * (item.quantity || 1));
		}, 0);
	}
}

export const cart = new CartStore();
