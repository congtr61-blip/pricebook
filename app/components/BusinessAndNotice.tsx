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

const weekdays = [
  ['monday', '周一'],
  ['tuesday', '周二'],
  ['wednesday', '周三'],
  ['thursday', '周四'],
  ['friday', '周五'],
  ['saturday', '周六'],
  ['sunday', '周日'],
] as const

export function BusinessAndNotice({ businessHours, announcements, isAdmin }: { businessHours: BusinessHours[]; announcements: Announcement[]; isAdmin: boolean }) {
  const [hours, setHours] = useState(businessHours[0] ?? null)
  const [savedHours, setSavedHours] = useState(businessHours[0] ?? null)
  const [items, setItems] = useState(announcements)
  const [message, setMessage] = useState('')
  const [editingHours, setEditingHours] = useState(false)
  const [savingHours, setSavingHours] = useState(false)

  async function saveBusinessHours() {
    if (!hours || !isAdmin) return
    setSavingHours(true)
    const response = await fetch('/api/admin/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'hours', hours }),
    })
    const result = await response.json().catch(() => ({}))
    setSavingHours(false)
    if (!response.ok) {
      setMessage(result.error ?? '更新失败')
      return
    }
    setSavedHours(hours)
    setEditingHours(false)
    setMessage('营业时间已更新')
  }

  function cancelHoursEdit() {
    setHours(savedHours)
    setEditingHours(false)
    setMessage('')
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

      <div className="content-block hours-block">
        <div className="hours-heading">
          <div><p className="eyebrow">WEEKLY SCHEDULE</p><h3>营业时间</h3></div>
          {isAdmin && !editingHours && <button className="button light" type="button" onClick={() => setEditingHours(true)}>编辑时间</button>}
        </div>
        {editingHours && isAdmin ? (
          <div className="hours-editor">
            {weekdays.map(([day, label], index) => (
              <label className="hours-edit-row" key={day}>
                <span className={`weekday weekday-${index}`}>{label}</span>
                <input aria-label={`${label}营业时间`} value={hours[day]} maxLength={40} onChange={(event) => setHours({ ...hours, [day]: event.target.value })} placeholder="09:00-18:00 或 休息" />
              </label>
            ))}
            <div className="hours-actions">
              <button className="button dark" type="button" onClick={saveBusinessHours} disabled={savingHours}>{savingHours ? '保存中...' : '保存营业时间'}</button>
              <button className="button light" type="button" onClick={cancelHoursEdit} disabled={savingHours}>取消</button>
            </div>
          </div>
        ) : (
          <div className="hours-display">
            {weekdays.map(([day, label], index) => (
              <div className={`hours-day ${index > 4 ? 'weekend' : ''}`} key={day}>
                <span className="weekday">{label}</span>
                <strong>{(savedHours ?? hours)[day]}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="content-block">
        <h3>公告</h3>
        {items.map((item) => (
          <div key={item.id} className="announcement-box">
            {isAdmin ? <>
              <input value={item.title} onChange={(event) => setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, title: event.target.value } : entry))} />
              <textarea value={item.content} onChange={(event) => setItems((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, content: event.target.value } : entry))} />
              <button className="button light" onClick={() => saveAnnouncement(item)}>保存公告</button>
            </> : <>
              <strong>{item.title}</strong>
              <p>{item.content}</p>
            </>}
          </div>
        ))}
      </div>

      {message && <p className="save-message">{message}</p>}
    </section>
  )
}
