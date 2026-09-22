import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId, status } = await request.json().catch(() => ({}))
  if (!orderId || !status) {
    return NextResponse.json({ error: 'Invalid order update payload' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!['confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
  }

  const { data: order, error: orderError } = await supabase.from('orders').select('status').eq('id', orderId).single()
  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: '已取消的订单不能再次操作' }, { status: 409 })
  }

  if (order.status === 'confirmed' && status === 'confirmed') {
    return NextResponse.json({ error: '订单已经确认' }, { status: 409 })
  }

  const { error } = status === 'cancelled'
    ? await supabase.rpc('cancel_order', { p_order_id: orderId })
    : await supabase.from('orders').update({ status }).eq('id', orderId).eq('status', order.status)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
