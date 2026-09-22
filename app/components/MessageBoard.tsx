'use client'

import { useState } from 'react'

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Asia/Shanghai',
})

type Message = {
  id: string
  sender: string
  content: string
  is_read: boolean
  created_at: string
}

export function MessageBoard({ initialMessages, isAdmin }: { initialMessages: Message[]; isAdmin: boolean }) {
  const [messages, setMessages] = useState(initialMessages)
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')

  async function sendMessage() {
    if (!draft.trim()) return
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft.trim(), sender: isAdmin ? 'admin' : 'merchant' }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(result.error ?? '发送失败')
      return
    }
    setDraft('')
    setMessage('消息已发送')
    window.location.reload()
  }

  return (
    <section className="content-panel">
      <div className="section-heading order-heading">
        <div>
          <p className="eyebrow">Messages</p>
          <h2>{isAdmin ? '留言管理' : '留言板'}</h2>
        </div>
      </div>

      <div className="message-list">
        {messages.length === 0 ? <p className="empty-state">暂无消息</p> : messages.map((msg) => (
          <article key={msg.id} className={`message-item ${msg.sender === 'merchant' ? 'merchant' : 'admin'} ${msg.is_read ? '' : 'unread'}`}>
            <span>{msg.sender === 'merchant' ? '商户' : '管理员'}</span>
            <p>{msg.content}</p>
            <small>{dateFormatter.format(new Date(msg.created_at))}</small>
          </article>
        ))}
      </div>

      {!isAdmin && (
        <div className="message-composer">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="输入留言内容" />
          <button className="button dark" onClick={sendMessage}>发送留言</button>
        </div>
      )}

      {message && <p className="save-message">{message}</p>}
    </section>
  )
}
