alter table public.products
	add column if not exists size_prices jsonb not null default '[]'::jsonb,
	add column if not exists dark_color_surcharge numeric not null default 0;

alter table public.orders
	add column if not exists estimated_subtotal numeric not null default 0,
	add column if not exists size_price numeric,
	add column if not exists dark_color_surcharge numeric not null default 0,
	add column if not exists cake_topper_fee numeric not null default 0,
	add column if not exists estimated_unit_price numeric,
	add column if not exists has_cake_topper boolean not null default false;

alter table public.order_items
	add column if not exists size_price numeric,
	add column if not exists dark_color_surcharge numeric not null default 0,
	add column if not exists cake_topper_fee numeric not null default 0,
	add column if not exists estimated_unit_price numeric,
	add column if not exists estimated_subtotal numeric,
	add column if not exists has_cake_topper boolean not null default false;
