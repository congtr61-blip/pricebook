'use client'

import { useState } from 'react'

type Product = {
  id: string
  name: string
  unit: string
  base_price: number
  stock: number
}

export function MerchantOrderPanel({ products }: { products: Product[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [pickupTime, setPickupTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const selectedItems = products
    .filter((product) => Number(quantities[product.id] ?? 0) > 0)
    .map((product) => ({
      product_id: product.id,
      quantity: Number(quantities[product.id] ?? 0),
    }))

  async function submitOrder() {
    if (selectedItems.length === 0) {
      setMessage('请先选择商品数量')
      return
    }

    setLoading(true)
    setMessage('')

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: selectedItems,
        pickup_time: pickupTime || null,
      }),
    })

    const result = await response.json().catch(() => ({}))
    setLoading(false)

    if (!response.ok) {
      setMessage(result.error ?? '下单失败')
      return
    }

    setMessage('订单提交成功')
    setQuantities({})
    setPickupTime('')
    window.location.reload()
  }

  return (
    <section className="order-panel">
      <div className="section-heading order-heading">
        <div>
          <p className="eyebrow">Order</p>
          <h2>快捷下单</h2>
        </div>
      </div>

      <div className="order-list">
        {products.map((product) => (
          <div className="order-item" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <small>{product.unit} · 库存 {product.stock}</small>
            </div>
            <div className="qty-control">
              <button type="button" onClick={() => setQuantities({ ...quantities, [product.id]: Math.max(0, (quantities[product.id] ?? 0) - 1) })}>-</button>
              <input
                type="number"
                min={0}
                max={product.stock}
                value={quantities[product.id] ?? 0}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  setQuantities({ ...quantities, [product.id]: Math.max(0, Math.min(product.stock, value || 0)) })
                }}
              />
              <button type="button" onClick={() => setQuantities({ ...quantities, [product.id]: Math.min(product.stock, (quantities[product.id] ?? 0) + 1) })}>+</button>
            </div>
          </div>
        ))}
      </div>

      <label className="pickup-field">
        <span>取货时间</span>
        <input type="datetime-local" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} />
      </label>

      <button type="button" className="button dark full" onClick={submitOrder} disabled={loading}>
        {loading ? '提交中...' : '提交订单'}
      </button>

      {message && <p className={message.includes('失败') || message.includes('请先') ? 'save-message error' : 'save-message'}>{message}</p>}
    </section>
  )
}
