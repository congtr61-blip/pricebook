import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOrder } from '@/lib/orders'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)

  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json({ error: 'Invalid order payload' }, { status: 400 })
  }

  const { data, error } = await createOrder({
    merchantId: user.id,
    items: payload.items,
    note: payload.note ?? undefined,
    pickupTime: payload.pickup_time ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ order_id: data })
}
