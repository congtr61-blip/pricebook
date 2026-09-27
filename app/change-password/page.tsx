import { redirect } from 'next/navigation'
import { PasswordChangeForm } from '@/app/components/PasswordChangeForm'
import { LogoutButton } from '@/app/components/LogoutButton'
import { createClient } from '@/lib/supabase/server'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  return (
    <main className="login-page">
      <div className="login-aside">
        <span className="kicker">PRICEBOOK / ACCOUNT</span>
        <h1>保护账户，<br /><em>从新密码开始。</em></h1>
        <p>请使用不与临时密码相同的新密码。</p>
      </div>
      <div className="password-area">
        <div className="password-toolbar"><LogoutButton /></div>
        <PasswordChangeForm required={profile.must_change_password} />
      </div>
    </main>
  )
}
