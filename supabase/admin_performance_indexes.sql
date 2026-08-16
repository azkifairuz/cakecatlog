-- Indexes for the date/status/search filters used by the admin dashboard.
create extension if not exists pg_trgm;

create index if not exists orders_delivery_status_created_idx
	on public.orders (delivery_date, status, created_at desc);

create index if not exists orders_created_status_idx
	on public.orders (created_at desc, status);

create index if not exists orders_customer_name_trgm_idx
	on public.orders using gin (customer_name gin_trgm_ops);

create index if not exists orders_email_trgm_idx
	on public.orders using gin (email gin_trgm_ops);

create index if not exists products_active_available_created_idx
	on public.products (is_active, is_available, created_at desc);

create index if not exists products_category_active_created_idx
	on public.products (category_id, is_active, created_at desc);
