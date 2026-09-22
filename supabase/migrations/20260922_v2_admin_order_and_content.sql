create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  label text not null default '营业时间',
  monday text default '09:00-18:00',
  tuesday text default '09:00-18:00',
  wednesday text default '09:00-18:00',
  thursday text default '09:00-18:00',
  friday text default '09:00-18:00',
  saturday text default '10:00-16:00',
  sunday text default '休息',
  updated_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default '公告',
  content text not null default '',
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('merchant', 'admin')),
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

alter table public.business_hours enable row level security;
alter table public.announcements enable row level security;
alter table public.messages enable row level security;

create policy "read own messages" on public.messages
for select to authenticated
using (merchant_id = auth.uid() or is_admin());

create policy "insert merchant message" on public.messages
for insert to authenticated
with check ((sender = 'merchant' and merchant_id = auth.uid()) or (sender = 'admin' and is_admin()));

create policy "update own message read state" on public.messages
for update to authenticated
using (merchant_id = auth.uid() or is_admin())
with check (merchant_id = auth.uid() or is_admin());

create policy "read business hours" on public.business_hours
for select to authenticated using (true);

create policy "admin write business hours" on public.business_hours
for all to authenticated using (is_admin()) with check (is_admin());

create policy "read announcements" on public.announcements
for select to authenticated using (is_active);

create policy "admin write announcements" on public.announcements
for all to authenticated using (is_admin()) with check (is_admin());

insert into public.business_hours (label, monday, tuesday, wednesday, thursday, friday, saturday, sunday)
values ('营业时间', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', '10:00-16:00', '休息')
on conflict do nothing;

insert into public.announcements (title, content, is_active)
values ('欢迎', '欢迎使用 Pricebook，请提前确认取货时间。', true)
on conflict do nothing;
