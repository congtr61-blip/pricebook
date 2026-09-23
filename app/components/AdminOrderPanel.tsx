'use client'

import { useState } from 'react'

type OrderItem = { product_name: string; quantity: number; unit: string }
type Order = {
  id: string
  merchant_name: string
  merchant_phone: string | null
  merchant_tag: string | null
  status: string
  total: number
  note: string | null
  created_at: string
  pickup_time: string | null
  items: OrderItem[]
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
  timeZone: 'Asia/Shanghai',
})

const statusLabels: Record<string, string> = {
  pending: '待确认',
  confirmed: '已确认',
  cancelled: '已取消',
}

export function AdminOrderPanel({ initialOrders, locale = 'zh' }: { initialOrders: Order[]; locale?: 'zh' | 'en' }) {
  const [orders, setOrders] = useState(initialOrders)
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('')

  async function updateStatus(orderId: string, status: string) {
    setBusyIds((prev) => ({ ...prev, [orderId]: true }))
    const response = await fetch('/api/admin/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status }),
    })

    const result = await response.json().catch(() => ({}))
  setBusyIds((prev) => ({ ...prev, [orderId]: false }))
    if (!response.ok) {
      setMessage(result.error ?? '更新失败')
      return
    }

    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status } : order))
    setMessage('状态已更新')
  }

  return (
    <section className="orders-panel admin-order-panel">
      <div className="section-heading order-heading">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>{locale === 'zh' ? '订单管理' : 'Order management'}</h2>
        </div>
      </div>

      <div className="orders-list">
        {orders.length === 0 ? (<p className="empty-state">{locale === 'zh' ? '暂无订单' : 'No orders yet'}</p>) : orders.map((order) => (
          <details className={`order-card ${order.status === 'cancelled' ? 'is-cancelled' : ''}`} key={order.id}>
            <summary className="order-summary">
              <div className="order-card-top">
                <div>
                  <strong>{order.merchant_name}</strong>
                  <small>{order.merchant_tag ?? '未设置标签'}{order.merchant_phone ? ` · ${order.merchant_phone}` : ''}</small>
                  <small className={`order-status status-${order.status}`}>{locale === 'zh' ? (statusLabels[order.status] ?? order.status) : ({ pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' }[order.status] ?? order.status)}</small>
                </div>
                <span className="order-total">¥ {Number(order.total).toFixed(2)}</span>
              </div>
            </summary>

            <div className="order-details">
              <ul className="order-items">
                {order.items.map((item, idx) => (
                  <li key={`${order.id}-${idx}`}>{item.product_name} × {item.quantity}{item.unit}</li>
                ))}
              </ul>

              <div className="meta-row">
                <span>下单：{dateFormatter.format(new Date(order.created_at))}</span>
                <span>取货：{order.pickup_time ? dateFormatter.format(new Date(order.pickup_time)) : '未指定'}</span>
              </div>

              {order.note && <p className="order-note">客户备注：{order.note}</p>}

              {order.status === 'pending' && (
                <div className="admin-actions">
                  <button className="button light" onClick={() => updateStatus(order.id, 'confirmed')} disabled={busyIds[order.id]}>
                    {busyIds[order.id] ? '处理中...' : '确认订单'}
                  </button>
                  <button className="button dark" onClick={() => updateStatus(order.id, 'cancelled')} disabled={busyIds[order.id]}>取消订单</button>
                </div>
              )}
              {order.status === 'confirmed' && (
                <div className="admin-actions">
                  <button className="button dark" onClick={() => updateStatus(order.id, 'cancelled')} disabled={busyIds[order.id]}>
                    {busyIds[order.id] ? '处理中...' : '取消订单'}
                  </button>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>

      {message && <p className="save-message">{message}</p>}
    </section>
  )
}
