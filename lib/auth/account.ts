import type { SupabaseClient } from '@supabase/supabase-js'

export async function needsPasswordChange(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', userId)
    .single()

  return error || data?.must_change_password !== false
}
