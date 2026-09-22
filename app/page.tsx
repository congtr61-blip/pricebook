import { redirect } from 'next/navigation'
import { MerchantEditor } from '@/app/components/MerchantEditor'
import { ProductCard } from '@/app/components/ProductCard'
import { ProductEditor } from '@/app/components/ProductEditor'
import { LogoutButton } from '@/app/components/LogoutButton'
import { createClient } from '@/lib/supabase/server'

type Product = {
  id: string
  name: string
  unit: string
  base_price: number
  stock: number
  sort_order: number
}

type Profile = { id: string; username: string; tag: string | null; is_admin: boolean }
type Merchant = Profile & { merchant_prices: { product_id: string; price: number }[] }
type MerchantProduct = Product & { merchant_prices: { price: number }[] }

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('id, username, tag, is_admin').eq('id', user.id).single()

  if (!profile) redirect('/login')

  if (!profile.is_admin) {
    const { data: products } = await supabase.from('products').select('id, name, unit, base_price, stock, sort_order, merchant_prices(price)').order('sort_order')
    const merchantProducts = (products ?? []) as MerchantProduct[]
    const productList = merchantProducts.map((product) => ({
      ...product,
      finalPrice: product.merchant_prices[0]?.price ?? product.base_price,
      isCustom: product.merchant_prices.length > 0,
    }))
    return (
      <main className="shell">
        <header className="topbar"><div><span className="kicker">PRICEBOOK / MERCHANT</span><h1>您好，{profile.username}</h1></div><div className="topbar-actions"><span className="tag">{profile.tag ?? '合作商户'}</span><LogoutButton /></div></header>
        <section className="intro"><p className="eyebrow">当前价目表</p><h2>专属采购价格</h2><p>所有价格均为含税参考价，库存以实时数据为准。</p></section>
        <section className="product-grid">{productList.map((product) => <ProductCard key={product.id} product={product} price={product.finalPrice} isCustom={product.isCustom} />)}</section>
      </main>
    )
  }

  const { data: products } = await supabase.from('products').select('id, name, unit, base_price, stock, sort_order').order('sort_order')
  const { data: merchants } = await supabase.from('profiles').select('id, username, tag, is_admin, merchant_prices(product_id, price)').eq('is_admin', false).order('created_at')
  return (
    <main className="shell">
      <header className="topbar"><div><span className="kicker">PRICEBOOK / CONTROL ROOM</span><h1>价格簿管理</h1></div><div className="topbar-actions"><span className="admin-mark">ADMIN</span><LogoutButton /></div></header>
      <section className="admin-layout"><div><div className="section-heading"><div><p className="eyebrow">Catalog</p><h2>商品目录</h2></div></div><ProductEditor products={(products ?? []) as Product[]} /></div><div><div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>商户档案</h2></div></div><MerchantEditor merchants={(merchants ?? []) as Merchant[]} products={(products ?? []) as Product[]} /></div></section>
    </main>
  )
}
