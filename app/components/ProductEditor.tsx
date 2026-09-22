'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; unit: string; base_price: number; stock: number }
export function ProductEditor({ products }: { products: Product[] }) {
  const [rows, setRows] = useState(products)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  function updateRow(id: string, changes: Partial<Product>) {
    setRows(rows.map((row) => row.id === id ? { ...row, ...changes } : row))
  }

  async function saveProduct(product: Product) {
    setSavingId(product.id); setMessage('')
    const supabase = createClient()
    const { error } = await supabase.from('products').update({ name: product.name, unit: product.unit, base_price: product.base_price, stock: product.stock, updated_at: new Date().toISOString() }).eq('id', product.id)
    setSavingId(null)
    setMessage(error ? `保存失败：${error.message}` : '商品已保存')
  }

  async function addProduct() {
    setSavingId('new'); setMessage('')
    const supabase = createClient()
    const { data, error } = await supabase.from('products').insert({ name: '新商品', unit: '件', base_price: 0, stock: 0, sort_order: rows.length }).select('id, name, unit, base_price, stock').single()
    if (data) setRows([...rows, data])
    setSavingId(null)
    setMessage(error ? `新增失败：${error.message}` : '商品已新增')
  }

  return <div className="editor-list"><button className="button dark add-product" onClick={addProduct} disabled={savingId !== null}>{savingId === 'new' ? '新增中...' : '+ 新建商品'}</button>{rows.map((product) => <div className="editor-row" key={product.id}><input aria-label="商品名称" value={product.name} onChange={(event) => updateRow(product.id, { name: event.target.value })} /><input aria-label="单位" className="short-input" value={product.unit} onChange={(event) => updateRow(product.id, { unit: event.target.value })} /><label className="money-input"><span>¥</span><input aria-label="基础价格" type="number" step="0.01" value={product.base_price} onChange={(event) => updateRow(product.id, { base_price: Number(event.target.value) })} /></label><label className="stock-input"><span>库存</span><input aria-label="库存" type="number" value={product.stock} onChange={(event) => updateRow(product.id, { stock: Number(event.target.value) })} /></label><button className="icon-button" aria-label="保存商品" onClick={() => saveProduct(product)} disabled={savingId !== null}>{savingId === product.id ? '...' : '↗'}</button></div>)}{message && <p className={message.includes('失败') ? 'save-message error' : 'save-message'}>{message}</p>}</div>
}
