import { canonicalOrderStatus } from '../order-delivery-proof.js';
export function adaptProduct(product) {
	if (!product) return product;

	const fallbackUrl =
		product.primaryImageUrl ||
		product.primary_image_url ||
		product.imageUrl ||
		product.image_url ||
		null;

	const rawImages = product.images || product.product_images || [];
	const images = Array.isArray(rawImages)
		? rawImages
				.map((img, index) => {
					if (!img) return null;
					const url = typeof img === 'string' ? img : img.imageUrl || img.image_url || '';
					if (!url) return null;
					const isPrimary =
						typeof img === 'object'
							? img.isPrimary !== undefined
								? Boolean(img.isPrimary)
								: img.is_primary !== undefined
									? Boolean(img.is_primary)
									: index === 0
							: index === 0;

					return {
						id: typeof img === 'object' && img.id ? String(img.id) : `img-${index}`,
						image_url: url,
						imageUrl: url,
						is_primary: isPrimary,
						isPrimary: isPrimary
					};
				})
				.filter(Boolean)
		: [];

	if (images.length === 0 && fallbackUrl) {
		images.push({
			id: 'primary',
			image_url: fallbackUrl,
			imageUrl: fallbackUrl,
			is_primary: true,
			isPrimary: true
		});
	}

	const primaryImage =
		images.find((i) => i.is_primary || i.isPrimary) ||
		images[0] ||
		(fallbackUrl
			? {
					id: 'primary',
					image_url: fallbackUrl,
					imageUrl: fallbackUrl,
					is_primary: true,
					isPrimary: true
				}
			: null);

	const finalImageUrl = primaryImage?.image_url || primaryImage?.imageUrl || fallbackUrl || null;

	const variants = (product.variants || product.product_variants || []).map((v) => ({
		id: v.id,
		name: v.name,
		price: v.price,
		is_active: v.isActive !== undefined ? v.isActive : (v.is_active !== undefined ? v.is_active : true),
		isActive: v.isActive !== undefined ? v.isActive : (v.is_active !== undefined ? v.is_active : true),
		display_order: v.displayOrder !== undefined ? v.displayOrder : v.display_order,
		displayOrder: v.displayOrder !== undefined ? v.displayOrder : v.display_order
	}));

	const hasAddonRelations =
		Object.prototype.hasOwnProperty.call(product, 'addons') ||
		Object.prototype.hasOwnProperty.call(product, 'product_addons');
	const rawAddons = hasAddonRelations
		? (Array.isArray(product.addons) ? product.addons : (Array.isArray(product.product_addons) ? product.product_addons : []))
		: undefined;
	const addons = rawAddons?.map(adaptAddon) ?? undefined;

	const category =
		product.category ||
		(product.categoryName || product.category_name || product.categorySlug || product.category_slug
			? {
					id: product.categoryId || product.category_id || '',
					name: product.categoryName || product.category_name || '',
					slug: product.categorySlug || product.category_slug || ''
				}
			: null);

	return {
		...product,
		base_price: product.basePrice !== undefined ? product.basePrice : product.base_price,
		basePrice: product.basePrice !== undefined ? product.basePrice : product.base_price,
		is_available:
			product.isAvailable !== undefined
				? product.isAvailable
				: product.is_available !== undefined
					? product.is_available
					: true,
		isAvailable:
			product.isAvailable !== undefined
				? product.isAvailable
				: product.is_available !== undefined
					? product.is_available
					: true,
		is_active:
			product.isActive !== undefined
				? product.isActive
				: product.is_active !== undefined
					? product.is_active
					: true,
		isActive:
			product.isActive !== undefined
				? product.isActive
				: product.is_active !== undefined
					? product.is_active
					: true,
		handling_warning:
			product.handlingWarning !== undefined ? product.handlingWarning : product.handling_warning,
		handlingWarning:
			product.handlingWarning !== undefined ? product.handlingWarning : product.handling_warning,
		image_url: finalImageUrl,
		imageUrl: finalImageUrl,
		primary_image_url: finalImageUrl,
		primaryImageUrl: finalImageUrl,
		category,
		categories: category,
		category_id: product.categoryId ?? product.category_id ?? category?.id ?? null,
		categoryId: product.categoryId ?? product.category_id ?? category?.id ?? null,
		category_name: product.categoryName ?? product.category_name ?? category?.name ?? null,
		categoryName: product.categoryName ?? product.category_name ?? category?.name ?? null,
		category_slug: product.categorySlug ?? product.category_slug ?? category?.slug ?? null,
		categorySlug: product.categorySlug ?? product.category_slug ?? category?.slug ?? null,
		images,
		product_images: images,
		variants,
		product_variants: variants,
		...(hasAddonRelations ? { addons, product_addons: addons } : {}),
		global_addons: product.globalAddons || product.global_addons || []
	};
}

export function adaptProducts(products) {
	if (!Array.isArray(products)) return [];
	return products.map(adaptProduct);
}

export function adaptAddon(addon) {
	if (!addon) return addon;
	const nestedAddon = addon.addon || addon.global_addons || {};
	const id = addon.addonId || addon.addon_id || addon.id || nestedAddon.id;
	const active = addon.isActive !== undefined ? addon.isActive : (addon.is_active !== undefined ? addon.is_active : (nestedAddon.isActive ?? nestedAddon.is_active ?? true));
	const darkColor = addon.isDarkColor !== undefined ? addon.isDarkColor : (addon.is_dark_color !== undefined ? Boolean(addon.is_dark_color) : Boolean(nestedAddon.isDarkColor ?? nestedAddon.is_dark_color));
	const addPrice = addon.additionalPrice !== undefined ? addon.additionalPrice : (addon.additional_price !== undefined ? addon.additional_price : (addon.price ?? nestedAddon.additionalPrice ?? nestedAddon.additional_price ?? nestedAddon.price ?? 0));
	const surcharge = addon.darkColorSurcharge !== undefined ? addon.darkColorSurcharge : (addon.dark_color_surcharge !== undefined ? addon.dark_color_surcharge : (nestedAddon.darkColorSurcharge ?? nestedAddon.dark_color_surcharge ?? 0));

	return {
		...addon,
		id,
		addonId: id,
		addon_id: id,
		category: addon.category || nestedAddon.category || '',
		name: addon.name || nestedAddon.name || '',
		price: addPrice,
		additional_price: addPrice,
		additionalPrice: addPrice,
		is_active: Boolean(active),
		isActive: Boolean(active),
		is_dark_color: Boolean(darkColor),
		isDarkColor: Boolean(darkColor),
		dark_color_surcharge: surcharge,
		darkColorSurcharge: surcharge,
		display_order: addon.displayOrder !== undefined ? addon.displayOrder : addon.display_order,
		displayOrder: addon.displayOrder !== undefined ? addon.displayOrder : addon.display_order
	};
}

export function adaptAddons(addons) {
	if (!Array.isArray(addons)) return [];
	return addons.map(adaptAddon);
}

export function adaptOrderForm(form) {
	if (!form) return form;
	const adaptedProduct = form.product ? adaptProduct(form.product) : null;
	return {
		...form,
		is_active: form.isActive !== undefined ? form.isActive : (form.is_active !== undefined ? form.is_active : true),
		isActive: form.isActive !== undefined ? form.isActive : (form.is_active !== undefined ? form.is_active : true),
		product_id: form.productId || form.product_id,
		productId: form.productId || form.product_id,
		product: adaptedProduct,
		products: adaptedProduct
	};
}

export function adaptOrderItem(item, order = {}) {
	if (!item) return item;

	const id = item.id || `${order.id || 'item'}-${Math.random().toString(36).substring(2, 9)}`;
	const orderId = item.orderId || item.order_id || order.id || null;
	const productId = item.productId || item.product_id || order.productId || order.product_id || null;
	const productVariantId =
		item.productVariantId || item.product_variant_id || order.productVariantId || order.product_variant_id || null;
	const productName =
		item.productName ||
		item.product_name ||
		item.products?.name ||
		item.product?.name ||
		order.productName ||
		order.product_name ||
		order.products?.name ||
		'Produk';
	const variantName =
		item.variantName || item.variant_name || item.cakeSize || item.cake_size || order.cakeSize || order.cake_size || null;
	const quantity = Number(item.quantity ?? order.quantity ?? 1);
	const cakeSize = item.cakeSize || item.cake_size || variantName || order.cakeSize || order.cake_size || '-';

	const customizedOptions =
		item.customizedOptions || item.customized_options || order.customizedOptions || order.customized_options || null;

	const cakeFlavor =
		item.cakeFlavor ||
		item.cake_flavor ||
		customizedOptions?.flavor?.name ||
		customizedOptions?.flavor ||
		order.cakeFlavor ||
		order.cake_flavor ||
		null;
	const cakeColor =
		item.cakeColor ||
		item.cake_color ||
		customizedOptions?.color?.name ||
		customizedOptions?.color ||
		order.cakeColor ||
		order.cake_color ||
		null;
	const crownOption =
		item.crownOption ||
		item.crown_option ||
		customizedOptions?.crown?.name ||
		customizedOptions?.crown ||
		order.crownOption ||
		order.crown_option ||
		null;
	const addEdibleGlitter =
		item.addEdibleGlitter ||
		item.add_edible_glitter ||
		customizedOptions?.glitter?.name ||
		customizedOptions?.glitter ||
		order.addEdibleGlitter ||
		order.add_edible_glitter ||
		null;
	const cakeText =
		item.cakeText || item.cake_text || customizedOptions?.cake_text || order.cakeText || order.cake_text || null;
	const giftCardText =
		item.giftCardText ||
		item.gift_card_text ||
		customizedOptions?.gift_card_text ||
		order.giftCardText ||
		order.gift_card_text ||
		null;
	const referenceImageUrl =
		item.referenceImageUrl || item.reference_image_url || order.referenceImageUrl || order.reference_image_url || null;

	const sizePrice = Number(
		item.sizePrice ?? item.size_price ?? customizedOptions?.size?.price ?? order.sizePrice ?? order.size_price ?? 0
	);
	const darkColorSurcharge = Number(
		item.darkColorSurcharge ?? item.dark_color_surcharge ?? order.darkColorSurcharge ?? order.dark_color_surcharge ?? 0
	);
	const cakeTopperFee = Number(
		item.cakeTopperFee ??
			item.cake_topper_fee ??
			customizedOptions?.cake_topper?.price ??
			order.cakeTopperFee ??
			order.cake_topper_fee ??
			0
	);
	const hasCakeTopper = Boolean(
		item.hasCakeTopper ??
			item.has_cake_topper ??
			customizedOptions?.cake_topper?.selected ??
			order.hasCakeTopper ??
			order.has_cake_topper
	);

	const estimatedUnitPrice = Number(
		item.estimatedUnitPrice ??
			item.estimated_unit_price ??
			item.priceAtOrder ??
			item.price_at_order ??
			order.estimatedUnitPrice ??
			order.estimated_unit_price ??
			0
	);
	const estimatedSubtotal = Number(
		item.estimatedSubtotal ??
			item.estimated_subtotal ??
			(estimatedUnitPrice ? estimatedUnitPrice * quantity : (order.estimatedSubtotal ?? order.estimated_subtotal ?? order.amount ?? 0))
	);

	return {
		...item,
		id,
		order_id: orderId,
		orderId,
		product_id: productId,
		productId,
		product_variant_id: productVariantId,
		productVariantId,
		product_name: productName,
		productName,
		variant_name: variantName,
		variantName,
		quantity,
		cake_size: cakeSize,
		cakeSize,
		cake_flavor: cakeFlavor,
		cakeFlavor,
		cake_color: cakeColor,
		cakeColor,
		crown_option: crownOption,
		crownOption,
		add_edible_glitter: addEdibleGlitter,
		addEdibleGlitter,
		cake_text: cakeText,
		cakeText,
		gift_card_text: giftCardText,
		giftCardText,
		reference_image_url: referenceImageUrl,
		referenceImageUrl,
		size_price: sizePrice,
		sizePrice,
		dark_color_surcharge: darkColorSurcharge,
		darkColorSurcharge,
		cake_topper_fee: cakeTopperFee,
		cakeTopperFee,
		has_cake_topper: hasCakeTopper,
		hasCakeTopper,
		estimated_unit_price: estimatedUnitPrice,
		estimatedUnitPrice,
		estimated_subtotal: estimatedSubtotal,
		estimatedSubtotal,
		customized_options: customizedOptions,
		customizedOptions,
		products: {
			id: productId,
			name: productName
		}
	};
}

export function adaptOrder(order) {
	if (!order) return order;

	const id = order.id;
	const orderNumber = order.orderNumber !== undefined ? order.orderNumber : (order.order_number ?? null);
	const customerName = order.customerName || order.customer_name || '';
	const phoneNumber = order.phoneNumber || order.phone_number || '';
	const email = order.email || '';
	const address = order.address || '';
	const deliveryOption =
		order.deliveryOption || order.delivery_option || (address.toLowerCase() === 'pickup' ? 'pickup' : 'delivery');
	const pickupDate = order.pickupDate || order.pickup_date || (deliveryOption === 'pickup' ? (order.deliveryDate || order.delivery_date || '') : '');
	const pickupTime = order.pickupTime || order.pickup_time || (deliveryOption === 'pickup' ? (order.deliveryTime || order.delivery_time || '') : '');
	const rawDeliveryDate = order.deliveryDate || order.delivery_date || '';
	const rawDeliveryTime = order.deliveryTime || order.delivery_time || '';
	const deliveryDate = deliveryOption === 'pickup' ? (pickupDate || rawDeliveryDate) : (rawDeliveryDate || pickupDate);
	const deliveryTime = deliveryOption === 'pickup' ? (pickupTime || rawDeliveryTime) : (rawDeliveryTime || pickupTime);
	const deliveryVehicle = order.deliveryVehicle || order.delivery_vehicle || null;
	const deliveryFee = Number(order.deliveryFee ?? order.delivery_fee ?? 0);
	const cakePrice = Number(order.cakePrice ?? order.cake_price ?? 0);
	const amount = Number(order.amount ?? order.estimatedSubtotal ?? order.estimated_subtotal ?? 0);
	const status = canonicalOrderStatus(order.status || 'Pending');
	const createdAt = order.createdAt || order.created_at || '';
	const proofOfTransfer = order.proofOfTransfer || order.proof_of_transfer || null;

	const rawItems = order.items || order.orderItems || order.order_items;
	let items = [];

	if (Array.isArray(rawItems) && rawItems.length > 0) {
		items = rawItems.map((it) => adaptOrderItem(it, order));
	} else if (order.productName || order.productId || order.cakeSize || order.products?.name) {
		// Single item synthesized from root fields
		items = [
			adaptOrderItem(
				{
					id: `${id}-item-0`,
					orderId: id,
					productId: order.productId || order.product_id,
					productVariantId: order.productVariantId || order.product_variant_id,
					productName: order.productName || order.product_name || order.products?.name || 'Produk',
					cakeSize: order.cakeSize || order.cake_size || 'Standard',
					quantity: order.quantity || 1,
					cakeFlavor: order.cakeFlavor || order.cake_flavor,
					cakeColor: order.cakeColor || order.cake_color,
					crownOption: order.crownOption || order.crown_option,
					addEdibleGlitter: order.addEdibleGlitter || order.add_edible_glitter,
					cakeText: order.cakeText || order.cake_text,
					giftCardText: order.giftCardText || order.gift_card_text,
					referenceImageUrl: order.referenceImageUrl || order.reference_image_url,
					sizePrice: order.sizePrice || order.size_price,
					darkColorSurcharge: order.darkColorSurcharge || order.dark_color_surcharge,
					cakeTopperFee: order.cakeTopperFee || order.cake_topper_fee,
					hasCakeTopper: order.hasCakeTopper ?? order.has_cake_topper,
					estimatedUnitPrice: order.estimatedUnitPrice || order.estimated_unit_price,
					estimatedSubtotal: order.estimatedSubtotal || order.estimated_subtotal || amount,
					customizedOptions: order.customizedOptions || order.customized_options
				},
				order
			)
		];
	}

	const primaryProductName = items[0]?.productName || order.productName || order.products?.name || 'Produk';

	return {
		...order,
		id,
		order_number: orderNumber,
		orderNumber,
		customer_name: customerName,
		customerName,
		phone_number: phoneNumber,
		phoneNumber,
		email,
		address,
		delivery_option: deliveryOption,
		deliveryOption,
		delivery_date: deliveryDate,
		deliveryDate,
		delivery_time: deliveryTime,
		deliveryTime,
		pickup_date: pickupDate,
		pickupDate,
		pickup_time: pickupTime,
		pickupTime,
		delivery_vehicle: deliveryVehicle,
		deliveryVehicle,
		delivery_fee: deliveryFee,
		deliveryFee,
		cake_price: cakePrice,
		cakePrice,
		amount,
		status,
		created_at: createdAt,
		createdAt,
		proof_of_transfer: proofOfTransfer,
		proofOfTransfer,
		cakeInCarPhotoUrl: order.cakeInCarPhotoUrl ?? order.cake_in_car_photo_url ?? null,
		cake_in_car_photo_url: order.cakeInCarPhotoUrl ?? order.cake_in_car_photo_url ?? null,
		driverPhotoUrl: order.driverPhotoUrl ?? order.driver_photo_url ?? null,
		driver_photo_url: order.driverPhotoUrl ?? order.driver_photo_url ?? null,
		licensePlatePhotoUrl: order.licensePlatePhotoUrl ?? order.license_plate_photo_url ?? null,
		license_plate_photo_url: order.licensePlatePhotoUrl ?? order.license_plate_photo_url ?? null,
		items,
		order_items: items,
		orderItems: items,
		products: {
			name: primaryProductName
		},
		product_name: primaryProductName,
		productName: primaryProductName
	};
}

export function adaptOrders(orders) {
	if (!Array.isArray(orders)) return [];
	return orders.map(adaptOrder);
}

export function adaptExpenseCategory(category) {
	if (!category) return category;
	const id = category.id || '';
	const name = category.name || '';
	const createdAt = category.createdAt || category.created_at || '';
	const updatedAt = category.updatedAt || category.updated_at || '';

	return {
		...category,
		id,
		name,
		created_at: createdAt,
		createdAt,
		updated_at: updatedAt,
		updatedAt
	};
}

export function adaptExpenseCategories(categories) {
	if (!Array.isArray(categories)) return [];
	return categories.map(adaptExpenseCategory);
}

export function adaptExpense(expense) {
	if (!expense) return expense;
	const id = expense.id || '';
	const name = expense.name || '';
	const categoryId = expense.categoryId || expense.category_id || null;
	const categoryName = expense.categoryName || expense.category_name || expense.category?.name || '';
	const amount = Number(expense.amount ?? 0);
	const createdAt = expense.createdAt || expense.created_at || '';
	const updatedAt = expense.updatedAt || expense.updated_at || '';

	return {
		...expense,
		id,
		name,
		categoryId,
		category_id: categoryId,
		categoryName,
		category_name: categoryName,
		amount,
		created_at: createdAt,
		createdAt,
		updated_at: updatedAt,
		updatedAt
	};
}

export function adaptExpenses(expenses) {
	if (!Array.isArray(expenses)) return [];
	return expenses.map(adaptExpense);
}


