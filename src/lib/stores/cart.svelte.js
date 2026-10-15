import { applyCartQuote } from '../cart-pricing.js';
import { browser } from '$app/environment';

class CartStore {
	items = $state([]);
	isOpen = $state(false);

	constructor() {
		if (browser) {
			let stored;
			try { stored = localStorage.getItem('cake_cart'); } catch { stored = null; }
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					this.items = Array.isArray(parsed) ? parsed : [];
				} catch (e) {
					console.error('Failed to parse cart', e);
				}
			}
		}
	}

	save() {
		if (browser) {
			try { localStorage.setItem('cake_cart', JSON.stringify(this.items)); } catch { /* Keep the in-memory cart usable. */ }
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

	applyQuote(snapshot, priced) {
		const updated = applyCartQuote(this.items, snapshot, priced);
		if (!updated) return false;
		if (JSON.stringify(updated) !== JSON.stringify(this.items)) { this.items = updated; this.save(); }
		return true;
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
			const unitPrice = item.estimated_unit_price ?? item.price_at_order ?? 0;
			return sum + (unitPrice * (item.quantity || 1));
		}, 0);
	}
}

export const cart = new CartStore();
