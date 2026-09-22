alter table public.orders
  add column if not exists stock_restored_at timestamptz;

-- Existing cancellations were created before inventory restoration existed.
-- Restore each such order once, then mark it so this migration is safe to rerun.
do $$
begin
  update public.products p
  set stock = p.stock + restored.quantity,
      updated_at = now()
  from (
    select oi.product_id, sum(oi.quantity)::integer as quantity
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where o.status = 'cancelled'
      and o.stock_restored_at is null
    group by oi.product_id
  ) restored
  where p.id = restored.product_id;

  update public.orders
  set stock_restored_at = now()
  where status = 'cancelled'
    and stock_restored_at is null;
end
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_is_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select is_admin() into v_is_admin;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if not v_is_admin and v_order.merchant_id <> auth.uid() then
    raise exception 'Unauthorized order cancellation';
  end if;

  if v_order.status = 'cancelled' then
    raise exception 'Order already cancelled';
  end if;

  if not v_is_admin and v_order.status <> 'pending' then
    raise exception 'Only pending orders can be cancelled';
  end if;

  if v_order.stock_restored_at is null then
    update public.products p
    set stock = p.stock + restored.quantity,
        updated_at = now()
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = p_order_id
      group by product_id
    ) restored
    where p.id = restored.product_id;
  end if;

  update public.orders
  set status = 'cancelled',
      stock_restored_at = coalesce(stock_restored_at, now())
  where id = p_order_id;
end;
$$;

grant execute on function public.cancel_order(uuid) to authenticated;

notify pgrst, 'reload schema';
