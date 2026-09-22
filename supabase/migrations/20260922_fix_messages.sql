create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('merchant', 'admin')),
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'read own messages'
  ) then
    create policy "read own messages" on public.messages
      for select to authenticated
      using (merchant_id = auth.uid() or is_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'insert merchant message'
  ) then
    create policy "insert merchant message" on public.messages
      for insert to authenticated
      with check ((sender = 'merchant' and merchant_id = auth.uid()) or (sender = 'admin' and is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages' and policyname = 'update own message read state'
  ) then
    create policy "update own message read state" on public.messages
      for update to authenticated
      using (merchant_id = auth.uid() or is_admin())
      with check (merchant_id = auth.uid() or is_admin());
  end if;
end
$$;

notify pgrst, 'reload schema';
