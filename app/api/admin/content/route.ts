import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const { error } = await supabase.from('business_hours').upsert({
      id: hours.id,
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
