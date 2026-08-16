export function getEffectiveSelectedAddonIds(globalAddons = [], productAddonStates = {}) {
	return globalAddons
		.filter((addon) => {
			const override = productAddonStates[addon.id];
			if (override === 'active') return true;
			if (override === 'inactive') return false;
			return addon.is_active !== false;
		})
		.map((addon) => addon.id);
}

export function buildFixedProductAddonStates(globalAddons = [], selectedAddonIds = []) {
	const selected = new Set(selectedAddonIds);
	return Object.fromEntries(
		globalAddons.map((addon) => [addon.id, selected.has(addon.id) ? 'active' : 'inactive'])
	);
}

export function getEffectiveSelectedAddonCount(globalAddons = [], productAddonStates = {}) {
	return getEffectiveSelectedAddonIds(globalAddons, productAddonStates).length;
}
