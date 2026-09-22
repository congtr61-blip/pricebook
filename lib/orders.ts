import { createClient } from '@/lib/supabase/server'

export type OrderItemInput = {
  product_id: string
  quantity: number
}

export async function createOrder({
  merchantId,
  items,
  note,
  pickupTime,
}: {
  merchantId: string
  items: OrderItemInput[]
  note?: string
  pickupTime?: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_order', {
    p_merchant_id: merchantId,
    p_items: items,
    p_note: note ?? null,
    p_pickup_time: pickupTime ?? null,
  })

  return { data, error }
}
