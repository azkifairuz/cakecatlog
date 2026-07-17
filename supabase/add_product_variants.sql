create table if not exists public.product_variants (
	id uuid primary key default gen_random_uuid(),
	product_id uuid not null references public.products(id) on delete cascade,
	name varchar(100) not null,
	price numeric not null default 0,
	is_active boolean not null default true,
	display_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on public.product_variants(product_id);
create index if not exists product_variants_active_idx on public.product_variants(is_active);
create unique index if not exists product_variants_product_name_unique
	on public.product_variants(product_id, lower(name));

alter table public.orders
	add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;

alter table public.order_items
	add column if not exists product_variant_id uuid references public.product_variants(id) on delete set null;
