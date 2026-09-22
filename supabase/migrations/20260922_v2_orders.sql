create extension if not exists pgcrypto;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  total numeric(12,2) not null default 0,
  note text,
  pickup_time timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  product_name text not null,
  unit text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;
alter table order_items enable row level security;

create policy "merchant read own orders" on orders
for select to authenticated
using (merchant_id = auth.uid());

create policy "merchant insert own orders" on orders
for insert to authenticated
with check (merchant_id = auth.uid());

create policy "merchant update own pending orders" on orders
for update to authenticated
using (merchant_id = auth.uid() and status = 'pending')
with check (merchant_id = auth.uid() and status = 'pending');

create policy "admin read all orders" on orders
for select to authenticated
using (is_admin());

create policy "admin write all orders" on orders
for all to authenticated
using (is_admin())
with check (is_admin());

create policy "merchant read own order items" on order_items
for select to authenticated
using (
  exists (
    select 1 from orders o
    where o.id = order_id and o.merchant_id = auth.uid()
  )
);

create policy "merchant write own order items" on order_items
for all to authenticated
using (
  exists (
    select 1 from orders o
    where o.id = order_id and o.merchant_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from orders o
    where o.id = order_id and o.merchant_id = auth.uid()
  )
);

create policy "admin read all order items" on order_items
for select to authenticated
using (is_admin());

create policy "admin write all order items" on order_items
for all to authenticated
using (is_admin())
with check (is_admin());

create or replace function create_order(
  p_merchant_id uuid,
  p_items jsonb,
  p_note text default null,
  p_pickup_time timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_total numeric(12,2) := 0;
  v_product_name text;
  v_unit text;
  v_stock integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() <> p_merchant_id and not is_admin() then
    raise exception 'Unauthorized merchant';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Order items must be an array';
  end if;

  insert into orders (merchant_id, note, pickup_time, status)
  values (p_merchant_id, p_note, p_pickup_time, 'pending')
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);

    if v_quantity <= 0 then
      raise exception 'Quantity must be greater than 0';
    end if;

    select p.name, p.unit, p.stock
    into v_product_name, v_unit, v_stock
    from products p
    where p.id = v_product_id
    for update;

    if v_product_name is null then
      raise exception 'Product not found';
    end if;

    if v_stock < v_quantity then
      raise exception 'Insufficient stock for product %', v_product_id;
    end if;

    select coalesce(
      (select mp.price from merchant_prices mp where mp.merchant_id = p_merchant_id and mp.product_id = v_product_id),
      p.base_price
    )
    into v_unit_price
    from products p
    where p.id = v_product_id;

    insert into order_items (
      order_id,
      product_id,
      product_name,
      unit,
      quantity,
      unit_price,
      line_total
    ) values (
      v_order_id,
      v_product_id,
      v_product_name,
      v_unit,
      v_quantity,
      v_unit_price,
      v_unit_price * v_quantity
    );

    update products
    set stock = stock - v_quantity,
        updated_at = now()
    where id = v_product_id;

    v_total := v_total + (v_unit_price * v_quantity);
  end loop;

  update orders
  set total = v_total
  where id = v_order_id;

  return v_order_id;
end;
$$;

grant execute on function create_order(uuid, jsonb, text, timestamptz) to authenticated;
