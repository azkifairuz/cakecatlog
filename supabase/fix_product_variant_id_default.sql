alter table public.product_variants
	alter column id set default gen_random_uuid();
