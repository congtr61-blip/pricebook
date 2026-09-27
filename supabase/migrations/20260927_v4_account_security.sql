do $$
declare
  missing_tables text;
begin
  select string_agg(required.table_name, ', ' order by required.table_name)
  into missing_tables
  from unnest(array[
    'profiles',
    'products',
    'merchant_prices',
    'orders',
    'order_items',
    'business_hours',
    'announcements',
    'messages'
  ]) as required(table_name)
  where to_regclass(format('public.%I', required.table_name)) is null;

  if missing_tables is not null then
    raise exception 'Required tables are missing: %. Run the v2 orders and v2 admin/content migrations before this v4 migration.', missing_tables;
  end if;
end
$$;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists initial_password_hash text;

create or replace function public.has_completed_initial_password_change()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select not p.must_change_password from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.has_completed_initial_password_change() to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'products',
    'merchant_prices',
    'orders',
    'order_items',
    'business_hours',
    'announcements',
    'messages'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists require_password_change_complete on public.%I', table_name);
    execute format(
      'create policy require_password_change_complete on public.%I as restrictive for all to authenticated using (public.has_completed_initial_password_change()) with check (public.has_completed_initial_password_change())',
      table_name
    );
  end loop;
end
$$;

notify pgrst, 'reload schema';
