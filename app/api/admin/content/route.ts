import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { needsPasswordChange } from '@/lib/auth/account'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (await needsPasswordChange(supabase, user.id)) {
    return NextResponse.json({ error: '请先修改初始密码', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 428 })
  }

  const profile = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile.data?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await request.json().catch(() => null)
  if (!payload || !payload.type) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (payload.type === 'hours') {
    const { hours } = payload
    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
    if (!hours || dayKeys.some((day) => typeof hours[day] !== 'string' || hours[day].trim().length === 0 || hours[day].length > 40)) {
      return NextResponse.json({ error: '请为每一天填写有效营业时间（最多 40 个字符）' }, { status: 400 })
    }

    const { error } = await supabase.from('business_hours').upsert({
      ...(typeof hours.id === 'string' ? { id: hours.id } : {}),
      monday: hours.monday,
      tuesday: hours.tuesday,
      wednesday: hours.wednesday,
      thursday: hours.thursday,
      friday: hours.friday,
      saturday: hours.saturday,
      sunday: hours.sunday,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  if (payload.type === 'announcement') {
    const { announcement } = payload
    const { error } = await supabase.from('announcements').upsert({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      is_active: true,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unsupported type' }, { status: 400 })
}
