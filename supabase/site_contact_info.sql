create table if not exists public.site_contact_info (
	id text primary key default 'main',
	pickup_days text not null default 'MONDAY - SUNDAY',
	pickup_store_hours text not null default 'Store Hours: 09:00 - 18:00',
	pickup_manager_hours text not null default 'Manager Hours: 09:00 - 20:00',
	address text not null default 'Alamat toko belum diatur',
	whatsapp_number text not null default '0812-3456-7890',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint site_contact_info_single_row check (id = 'main')
);

insert into public.site_contact_info (
	id,
	pickup_days,
	pickup_store_hours,
	pickup_manager_hours,
	address,
	whatsapp_number
) values (
	'main',
	'MONDAY - SUNDAY',
	'Store Hours: 09:00 - 18:00',
	'Manager Hours: 09:00 - 20:00',
	'Alamat toko belum diatur',
	'0812-3456-7890'
)
on conflict (id) do nothing;

alter table public.site_contact_info enable row level security;

drop policy if exists "Allow public read site contact info" on public.site_contact_info;
create policy "Allow public read site contact info"
	on public.site_contact_info
	for select
	using (true);

drop policy if exists "Allow authenticated manage site contact info" on public.site_contact_info;
create policy "Allow authenticated manage site contact info"
	on public.site_contact_info
	for all
	to authenticated
	using (true)
	with check (true);
