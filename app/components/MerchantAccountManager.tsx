'use client'

import { useState } from 'react'

type MerchantAccount = {
  id: string
  username: string
  phone: string | null
  tag: string | null
  must_change_password: boolean
}

type TemporaryCredential = { username: string; password: string }

export function MerchantAccountManager({ initialMerchants }: { initialMerchants: MerchantAccount[] }) {
  const [merchants, setMerchants] = useState(initialMerchants)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [tag, setTag] = useState('')
  const [credential, setCredential] = useState<TemporaryCredential | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  async function createMerchant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/merchants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, phone, tag }),
    })
    const result = await response.json().catch(() => ({}))
    setBusy(false)

    if (!response.ok) {
      setMessage(result.error ?? '创建账号失败')
      return
    }

    setMerchants((current) => [{
      id: result.merchantId,
      username,
      phone: phone || null,
      tag: tag || null,
      must_change_password: true,
    }, ...current])
    setCredential({ username, password: result.temporaryPassword })
    setEmail('')
    setUsername('')
    setPhone('')
    setTag('')
    setCopied(false)
    setMessage('账号已创建。临时密码仅显示本次，请立即安全转交给商户。')
  }

  async function resetPassword(merchant: MerchantAccount) {
    setBusy(true)
    setMessage('')
    const response = await fetch('/api/admin/merchants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId: merchant.id }),
    })
    const result = await response.json().catch(() => ({}))
    setBusy(false)

    if (!response.ok) {
      setMessage(result.error ?? '重置密码失败')
      return
    }

    setMerchants((current) => current.map((item) => item.id === merchant.id ? { ...item, must_change_password: true } : item))
    setCredential({ username: merchant.username, password: result.temporaryPassword })
    setCopied(false)
    setMessage('密码已重置。临时密码仅显示本次，请立即安全转交给商户。')
  }

  async function copyCredential() {
    if (!credential) return
    await navigator.clipboard.writeText(credential.password)
    setCopied(true)
  }

  return (
    <section className="account-manager">
      <div className="section-heading">
        <div><p className="eyebrow">Merchant accounts</p><h2>账号管理</h2></div>
      </div>

      <form className="account-create-form" onSubmit={createMerchant}>
        <label>登录邮箱<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>商户名称<input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={80} required /></label>
        <label>联系电话<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} /></label>
        <label>商户标签<input value={tag} onChange={(event) => setTag(event.target.value)} maxLength={80} placeholder="例如：月结客户" /></label>
        <button className="button dark" disabled={busy}>{busy ? '处理中...' : '创建商户账号'}</button>
      </form>

      {credential && (
        <div className="temporary-credential" role="status">
          <div><strong>{credential.username} 的一次性临时密码</strong><code>{credential.password}</code></div>
          <button className="button light" type="button" onClick={copyCredential}>{copied ? '已复制' : '复制密码'}</button>
          <button className="icon-button" type="button" aria-label="关闭临时密码" onClick={() => setCredential(null)}>×</button>
        </div>
      )}

      {message && <p className={message.includes('失败') ? 'save-message error' : 'save-message'}>{message}</p>}

      <div className="account-list">
        {merchants.map((merchant) => (
          <article className="account-row" key={merchant.id}>
            <div><strong>{merchant.username}</strong><small>{merchant.tag ?? '未设置标签'}{merchant.phone ? ` · ${merchant.phone}` : ''}</small></div>
            <span className={`account-state ${merchant.must_change_password ? 'needs-password' : ''}`}>{merchant.must_change_password ? '待首次改密' : '正常'}</span>
            <button className="button light" type="button" onClick={() => resetPassword(merchant)} disabled={busy}>{busy ? '处理中...' : '重置密码'}</button>
          </article>
        ))}
      </div>
    </section>
  )
}