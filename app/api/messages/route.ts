import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function databaseError(error: { message: string }) {
  if (error.message.includes("Could not find the table 'public.messages'")) {
    return '留言功能尚未初始化，请先在 Supabase SQL Editor 执行 supabase/migrations/20260922_fix_messages.sql'
  }

  return error.message
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (profile.is_admin) {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: databaseError(error) }, { status: 400 })
    return NextResponse.json({ messages: data ?? [] })
  }

  const { data, error } = await supabase.from('messages').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: databaseError(error) }, { status: 400 })
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  if (!payload || !payload.content) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const sender = profile.is_admin ? 'admin' : 'merchant'
  const merchantId = profile.is_admin ? payload.merchant_id ?? null : user.id

  if (!merchantId) {
    return NextResponse.json({ error: 'Merchant id required' }, { status: 400 })
  }

  const { error } = await supabase.from('messages').insert({
    merchant_id: merchantId,
    sender,
    content: payload.content,
    is_read: false,
  })

  if (error) {
    return NextResponse.json({ error: databaseError(error) }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
