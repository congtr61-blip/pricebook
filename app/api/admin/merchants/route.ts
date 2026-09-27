import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function temporaryPassword() {
  return `${randomBytes(18).toString('base64url')}A7!`
}

function passwordHash(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

async function authorizeAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { response: NextResponse.json({ error: '请先登录' }, { status: 401 }) }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, must_change_password')
    .eq('id', user.id)
    .single()

  if (error || !profile?.is_admin) {
    return { response: NextResponse.json({ error: '无管理员权限' }, { status: 403 }) }
  }
  if (profile.must_change_password) {
    return { response: NextResponse.json({ error: '请先修改初始密码' }, { status: 428 }) }
  }

  return { supabase, user }
}

export async function POST(request: Request) {
  const auth = await authorizeAdmin()
  if ('response' in auth) return auth.response

  const payload = await request.json().catch(() => null)
  const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const username = typeof payload?.username === 'string' ? payload.username.trim() : ''
  const phone = typeof payload?.phone === 'string' ? payload.phone.trim() : ''
  const tag = typeof payload?.tag === 'string' ? payload.tag.trim() : ''

  if (!/^\S+@\S+\.\S+$/.test(email) || !username || username.length > 80) {
    return NextResponse.json({ error: '请填写有效邮箱和商户名称' }, { status: 400 })
  }
  if (phone.length > 40 || tag.length > 80) {
    return NextResponse.json({ error: '电话或标签长度超出限制' }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: '服务器尚未配置 SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }

  const password = temporaryPassword()
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? '创建认证账号失败' }, { status: 400 })
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: created.user.id,
    username,
    phone: phone || null,
    tag: tag || null,
    is_admin: false,
    must_change_password: true,
    initial_password_hash: passwordHash(password),
  }, { onConflict: 'id' })

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: `商户档案创建失败，认证账号已清理：${profileError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, merchantId: created.user.id, temporaryPassword: password })
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdmin()
  if ('response' in auth) return auth.response

  const payload = await request.json().catch(() => null)
  const merchantId = typeof payload?.merchantId === 'string' ? payload.merchantId : ''
  if (!merchantId || merchantId === auth.user.id) {
    return NextResponse.json({ error: '请选择有效商户' }, { status: 400 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: '服务器尚未配置 SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 })
  }

  const { data: merchant, error: lookupError } = await admin
    .from('profiles')
    .select('id, is_admin')
    .eq('id', merchantId)
    .single()

  if (lookupError || !merchant || merchant.is_admin) {
    return NextResponse.json({ error: '商户账号不存在' }, { status: 404 })
  }

  const password = temporaryPassword()
  const { error: flagError } = await admin.from('profiles')
    .update({ must_change_password: true, initial_password_hash: passwordHash(password) })
    .eq('id', merchantId)
  if (flagError) return NextResponse.json({ error: flagError.message }, { status: 500 })

  const { error: passwordError } = await admin.auth.admin.updateUserById(merchantId, { password })
  if (passwordError) {
    await admin.from('profiles').update({ must_change_password: false, initial_password_hash: null }).eq('id', merchantId)
    return NextResponse.json({ error: passwordError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, temporaryPassword: password })
}