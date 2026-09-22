'use client'

import { useState } from 'react'

type OrderItem = {
  product_name: string
  quantity: number
  unit: string
}

type Order = {
  id: string
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

export function OrderList({ orders }: { orders: Order[] }) {
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState('')

  async function cancelOrder(orderId: string) {
    setBusyIds((prev) => ({ ...prev, [orderId]: true }))
    const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
    const result = await response.json().catch(() => ({}))
    setBusyIds((prev) => ({ ...prev, [orderId]: false }))
    if (!response.ok) {
      setMessage(result.error ?? '取消失败')
      return
    }
    setMessage('订单已取消')
    window.location.reload()
  }

  return (
    <section className="orders-panel">
      <div className="section-heading order-heading">
        <div>
          <p className="eyebrow">My Orders</p>
          <h2>我的订单</h2>
        </div>
      </div>

      <div className="orders-list">
        {orders.length === 0 ? (
          <p className="empty-state">暂无订单</p>
        ) : (
          orders.map((order) => (
            <details className={`order-card ${order.status === 'cancelled' ? 'is-cancelled' : ''}`} key={order.id}>
              <summary className="order-summary">
                <div className="order-card-top">
                  <div>
                    <strong>订单 {order.id.slice(0, 8)}</strong>
                    <small className={`order-status status-${order.status}`}>{statusLabels[order.status] ?? order.status}</small>
                  </div>
                  <span className="order-total">¥ {Number(order.total).toFixed(2)}</span>
                </div>
              </summary>

              <div className="order-details">
                <ul className="order-items">
                  {order.items.map((item, idx) => (
                    <li key={`${order.id}-${idx}`}>
                      {item.product_name} × {item.quantity}{item.unit}
                    </li>
                  ))}
                </ul>

                <div className="meta-row">
                  <span>下单：{dateFormatter.format(new Date(order.created_at))}</span>
                  <span>取货：{order.pickup_time ? dateFormatter.format(new Date(order.pickup_time)) : '未指定'}</span>
                </div>

                {order.status === 'pending' && (
                  <button className="button light" onClick={() => cancelOrder(order.id)} disabled={busyIds[order.id]}>
                    {busyIds[order.id] ? '取消中...' : '取消订单'}
                  </button>
                )}
              </div>
            </details>
          ))
        )}
      </div>

      {message && <p className="save-message">{message}</p>}
    </section>
  )
}
