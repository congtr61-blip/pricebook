import { redirect } from 'next/navigation'
import { MerchantEditor } from '@/app/components/MerchantEditor'
import { ProductCard } from '@/app/components/ProductCard'
import { ProductEditor } from '@/app/components/ProductEditor'
import { LogoutButton } from '@/app/components/LogoutButton'
import { MerchantOrderPanel } from '@/app/components/MerchantOrderPanel'
import { OrderList } from '@/app/components/OrderList'
import { AdminOrderPanel } from '@/app/components/AdminOrderPanel'
import { BusinessAndNotice } from '@/app/components/BusinessAndNotice'
import { MessageBoard } from '@/app/components/MessageBoard'
import { LanguageToggle, type Locale } from '@/app/components/LanguageToggle'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

type Product = {
  id: string
  name: string
  unit: string
  base_price: number
  stock: number
  sort_order: number
}

type Profile = { id: string; username: string; phone: string | null; tag: string | null; is_admin: boolean }
type Merchant = Profile & { merchant_prices: { product_id: string; price: number }[] }
type MerchantProduct = Product & { merchant_prices: { price: number }[] }

export default async function HomePage() {
  const localeCookie = (await cookies()).get('pricebook-locale')?.value
  const locale: Locale = localeCookie === 'en' ? 'en' : 'zh'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id, username, phone, tag, is_admin').eq('id', user.id).single()

  if (!profile) redirect('/login')

  if (!profile.is_admin) {
    const { data: products } = await supabase.from('products').select('id, name, unit, base_price, stock, sort_order, merchant_prices(price)').order('sort_order')
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, total, note, created_at, pickup_time, order_items(product_name, quantity, unit)')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false })

    const { data: businessHours } = await supabase.from('business_hours').select('*').limit(1)
    const { data: announcements } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })
    const { data: messages } = await supabase.from('messages').select('*').eq('merchant_id', user.id).order('created_at', { ascending: false })

    const merchantProducts = (products ?? []) as MerchantProduct[]
    const productList = merchantProducts.map((product) => ({
      ...product,
      finalPrice: product.merchant_prices[0]?.price ?? product.base_price,
      isCustom: product.merchant_prices.length > 0,
    }))

    return (
      <main className="shell">
        <header className="topbar"><div><span className="kicker">PRICEBOOK / MERCHANT</span><h1>{locale === 'zh' ? '您好' : 'Hello'}，{profile.username}</h1></div><div className="topbar-actions"><span className="tag">{profile.tag ?? (locale === 'zh' ? '合作商户' : 'Merchant')}</span><LanguageToggle locale={locale} /><LogoutButton /></div></header>
        <section className="intro"><p className="eyebrow">{locale === 'zh' ? '当前价目表' : 'CURRENT PRICEBOOK'}</p><h2>{locale === 'zh' ? '专属采购价格' : 'Your prices'}</h2><p>{locale === 'zh' ? '所有价格均为含税参考价，库存以实时数据为准。' : 'Tax-inclusive reference prices. Stock is updated in real time.'}</p></section>
        <section className="product-grid">{productList.map((product) => <ProductCard key={product.id} product={product} price={product.finalPrice} isCustom={product.isCustom} locale={locale} />)}</section>
        <div className="merchant-actions"><MerchantOrderPanel products={productList.map((product) => ({ id: product.id, name: product.name, unit: product.unit, base_price: product.finalPrice, stock: product.stock }))} locale={locale} /><OrderList locale={locale} orders={(orders ?? []).map((order) => ({
          id: order.id,
          status: order.status,
          total: Number(order.total),
          note: order.note,
          created_at: order.created_at,
          pickup_time: order.pickup_time,
          items: (order.order_items ?? []).map((item: any) => ({
            product_name: item.product_name,
            quantity: Number(item.quantity),
            unit: item.unit,
          })),
        }))} /></div>
        <div className="content-grid"><BusinessAndNotice businessHours={(businessHours ?? []) as any[]} announcements={(announcements ?? []) as any[]} /><MessageBoard initialMessages={(messages ?? []) as any[]} isAdmin={false} /></div>
      </main>
    )
  }

  const { data: products } = await supabase.from('products').select('id, name, unit, base_price, stock, sort_order').order('sort_order')
  const { data: merchants } = await supabase.from('profiles').select('id, username, phone, tag, is_admin, merchant_prices(product_id, price)').eq('is_admin', false).order('created_at')
  const { data: orders } = await supabase.from('orders').select('id, merchant_id, status, total, note, created_at, pickup_time, order_items(product_name, quantity, unit), profiles(username, phone, tag)').order('created_at', { ascending: false })
  const { data: businessHours } = await supabase.from('business_hours').select('*').limit(1)
  const { data: announcements } = await supabase.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false })
  const { data: messages } = await supabase.from('messages').select('*').order('created_at', { ascending: false })

  return (
    <main className="shell">
      <header className="topbar"><div><span className="kicker">PRICEBOOK / CONTROL ROOM</span><h1>{locale === 'zh' ? '价格簿管理' : 'Pricebook admin'}</h1></div><div className="topbar-actions"><span className="admin-mark">ADMIN</span><LanguageToggle locale={locale} /><LogoutButton /></div></header>
      <section className="admin-layout"><div><div className="section-heading"><div><p className="eyebrow">Catalog</p><h2>商品目录</h2></div></div><ProductEditor products={(products ?? []) as Product[]} /></div><div><div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>商户档案</h2></div></div><MerchantEditor merchants={(merchants ?? []) as Merchant[]} products={(products ?? []) as Product[]} /></div></section>
      <div className="admin-secondary"><AdminOrderPanel locale={locale} initialOrders={(orders ?? []).map((order: any) => ({ id: order.id, merchant_name: order.profiles?.username ?? '商户', merchant_phone: order.profiles?.phone ?? null, merchant_tag: order.profiles?.tag ?? null, status: order.status, total: Number(order.total), note: order.note, created_at: order.created_at, pickup_time: order.pickup_time, items: (order.order_items ?? []).map((item: any) => ({ product_name: item.product_name, quantity: Number(item.quantity), unit: item.unit })) }))} /><BusinessAndNotice businessHours={(businessHours ?? []) as any[]} announcements={(announcements ?? []) as any[]} /><MessageBoard initialMessages={(messages ?? []) as any[]} isAdmin={true} /></div>
    </main>
  )
}
