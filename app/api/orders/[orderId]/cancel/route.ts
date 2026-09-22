import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId } = await params
  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('merchant_id', user.id)
    .single()

  if (lookupError || !order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  if (order.status !== 'pending') {
    return NextResponse.json({ error: '只有待确认订单可以取消' }, { status: 409 })
  }

  const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
