'use client'

import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.assign('/login')
  }

  return <button className="logout-button" onClick={handleLogout}>退出登录</button>
}
