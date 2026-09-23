'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Product = { id: string; name: string; unit: string; base_price: number }
type Merchant = { id: string; username: string; phone: string | null; tag: string | null; merchant_prices: { product_id: string; price: number }[] }
export function MerchantEditor({ merchants, products }: { merchants: Merchant[]; products: Product[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tags, setTags] = useState(Object.fromEntries(merchants.map((merchant) => [merchant.id, merchant.tag ?? ''])))
  const [phones, setPhones] = useState(Object.fromEntries(merchants.map((merchant) => [merchant.id, merchant.phone ?? ''])))
  const [prices, setPrices] = useState<Record<string, Record<string, string>>>(Object.fromEntries(merchants.map((merchant) => [merchant.id, Object.fromEntries(merchant.merchant_prices.map((price) => [price.product_id, String(price.price)]))])))
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  async function saveMerchant(merchant: Merchant) {
    setSavingId(merchant.id); setMessage('')
    const supabase = createClient()
    const { error: profileError } = await supabase.from('profiles').update({ tag: tags[merchant.id] || null, phone: phones[merchant.id] || null }).eq('id', merchant.id)
    if (profileError) { setMessage(`保存失败：${profileError.message}`); setSavingId(null); return }
    const priceRows = Object.entries(prices[merchant.id] ?? {}).filter(([, value]) => value !== '').map(([product_id, value]) => ({ merchant_id: merchant.id, product_id, price: Number(value) }))
    const { error: priceError } = priceRows.length ? await supabase.from('merchant_prices').upsert(priceRows) : { error: null }
    setSavingId(null)
    setMessage(priceError ? `保存失败：${priceError.message}` : '商户信息已保存')
  }

  return <div className="merchant-list">{merchants.map((merchant) => <article className="merchant-row" key={merchant.id}><button className="merchant-summary" onClick={() => setExpanded(expanded === merchant.id ? null : merchant.id)}><span className="avatar">{merchant.username.slice(0, 1).toUpperCase()}</span><span><strong>{merchant.username}</strong><small>{merchant.tag ?? '未设置标签'}{merchant.phone ? ` · ${merchant.phone}` : ''}</small></span><span className="chevron">{expanded === merchant.id ? '−' : '+'}</span></button>{expanded === merchant.id && <div className="price-panel"><label><span>商户标签</span><input value={tags[merchant.id]} onChange={(event) => setTags({ ...tags, [merchant.id]: event.target.value })} placeholder="例如 VIP客户" /></label><label><span>联系电话</span><input type="tel" value={phones[merchant.id]} onChange={(event) => setPhones({ ...phones, [merchant.id]: event.target.value })} placeholder="例如 13800138000" /></label>{products.map((product) => { const custom = prices[merchant.id]?.[product.id] ?? ''; return <label key={product.id}><span>{product.name}<small>基础价 ¥{Number(product.base_price).toFixed(2)}</small></span><input type="number" step="0.01" placeholder={Number(product.base_price).toFixed(2)} value={custom} onChange={(event) => setPrices({ ...prices, [merchant.id]: { ...prices[merchant.id], [product.id]: event.target.value } })} /></label> })}<button className="button light" onClick={() => saveMerchant(merchant)} disabled={savingId !== null}>{savingId === merchant.id ? '保存中...' : '保存商户信息'}</button></div>}</article>)}{message && <p className={message.includes('失败') ? 'save-message error' : 'save-message'}>{message}</p>}</div>
}
