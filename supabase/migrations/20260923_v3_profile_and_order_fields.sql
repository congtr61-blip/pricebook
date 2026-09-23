alter table public.profiles
  add column if not exists phone text;

alter table public.orders
  add column if not exists note text;

notify pgrst, 'reload schema';
