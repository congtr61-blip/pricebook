import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: '登录状态已失效，请重新登录' }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const password = typeof payload?.password === 'string' ? payload.password : ''
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: '密码长度需要为 8 至 128 位' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('must_change_password, initial_password_hash')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: '无法读取账号状态，请联系管理员' }, { status: 500 })
  }

  if (profile.must_change_password && profile.initial_password_hash) {
    const candidateHash = createHash('sha256').update(password).digest()
    const temporaryHash = Buffer.from(profile.initial_password_hash, 'hex')
    if (candidateHash.length === temporaryHash.length && timingSafeEqual(candidateHash, temporaryHash)) {
      return NextResponse.json({ error: '新密码不能与临时密码相同' }, { status: 400 })
    }
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password })
  if (passwordError) {
    return NextResponse.json({ error: passwordError.message }, { status: 400 })
  }

  if (profile.must_change_password) {
    try {
      const admin = createAdminClient()
      const { error } = await admin.from('profiles')
        .update({ must_change_password: false, initial_password_hash: null })
        .eq('id', user.id)
      if (error) throw error
    } catch {
      return NextResponse.json({ error: '密码已更新，但账号状态未能同步。请再次提交新密码或联系管理员。' }, { status: 503 })
    }
  }

  return NextResponse.json({ ok: true })
}