'use client'

import { useState } from 'react'

type BusinessHours = {
  id: string
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
}

type Announcement = {
  id: string
  title: string
  content: string
}

export function BusinessAndNotice({ businessHours, announcements }: { businessHours: BusinessHours[]; announcements: Announcement[] }) {
  const [hours, setHours] = useState(businessHours[0] ?? null)
  const [items, setItems] = useState(announcements)
  const [message, setMessage] = useState('')

  async function saveBusinessHours() {
    if (!hours) return
    const response = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'hours', hours }),
    })
    const result = await response.json().catch(() => ({}))
    setMessage(response.ok ? '营业时间已更新' : result.error ?? '更新失败')
  }

  async function saveAnnouncement(item: Announcement) {
    const response = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'announcement', announcement: item }),
    })
    const result = await response.json().catch(() => ({}))
    setMessage(response.ok ? '公告已更新' : result.error ?? '更新失败')
  }

  if (!hours) return null

  return (
    <section className="content-panel">
      <div className="section-heading order-heading">
        <div>
          <p className="eyebrow">Info</p>
          <h2>营业与公告</h2>
        </div>
      </div>

      <div className="content-block">
        <h3>营业时间</h3>
        <div className="hours-grid">
          {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
            <label key={day}>
              <span>{day}</span>
              <input value={hours[day]} onChange={(event) => setHours({ ...hours, [day]: event.target.value })} />
            </label>
          ))}
        </div>
        <button className="button dark" onClick={saveBusinessHours}>保存营业时间</button>
      </div>

      <div className="content-block">
        <h3>公告</h3>
        {items.map((item) => (
          <div key={item.id} className="announcement-box">
            <input value={item.title} onChange={(event) => setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry))} />
            <textarea value={item.content} onChange={(event) => setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, content: event.target.value } : entry))} />
            <button className="button light" onClick={() => saveAnnouncement(item)}>保存公告</button>
          </div>
        ))}
      </div>

      {message && <p className="save-message">{message}</p>}
    </section>
  )
}
