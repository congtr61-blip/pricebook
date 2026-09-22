'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError('账号或密码不正确'); setLoading(false); return }
    window.location.assign('/')
  }

  return <main className="login-page"><div className="login-aside"><span className="kicker">PRICEBOOK</span><h1>让每一份报价，<br /><em>都有据可循。</em></h1><p>一个清晰、可靠的商户价格工作台。</p></div><form className="login-form" onSubmit={handleSubmit}><p className="eyebrow">欢迎回来</p><h2>登录账户</h2><label>邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="name@company.com" /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="输入密码" /></label>{error && <p className="error">{error}</p>}<button className="button dark full" disabled={loading}>{loading ? '登录中...' : '进入价格簿 →'}</button></form></main>
}
