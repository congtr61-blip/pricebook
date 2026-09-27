'use client'

import { useState } from 'react'

export function PasswordChangeForm({ required }: { required: boolean }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('新密码至少需要 8 位')
      return
    }
    if (password !== confirmation) {
      setError('两次输入的密码不一致')
      return
    }

    setSaving(true)
    const response = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const result = await response.json().catch(() => ({}))
    setSaving(false)

    if (!response.ok) {
      setError(result.error ?? '密码修改失败')
      return
    }

    setSuccess(true)
    if (required) window.location.assign('/')
  }

  if (success) return <p className="save-message">密码已更新</p>

  return (
    <form className="login-form password-form" onSubmit={submit}>
      <p className="eyebrow">Account security</p>
      <h2>{required ? '设置新密码' : '修改密码'}</h2>
      {required && <p className="password-notice">首次登录需要先修改临时密码，完成后即可进入价格簿。</p>}
      <label>新密码<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label>确认新密码<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
      {error && <p className="error">{error}</p>}
      <button className="button dark full" disabled={saving}>{saving ? '保存中...' : '更新密码'}</button>
      {!required && <a className="password-back" href="/">返回价格簿</a>}
    </form>
  )
}
