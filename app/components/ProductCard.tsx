type ProductCardProps = { product: { name: string; unit: string; base_price: number; stock: number }; price: number; isCustom?: boolean; locale?: 'zh' | 'en' }

export function ProductCard({ product, price, isCustom, locale = 'zh' }: ProductCardProps) {
  const inStock = product.stock > 0
  return <article className="product-card"><div className="product-number">{String(product.stock).padStart(2, '0')}</div><div className="product-info"><h3>{product.name}</h3><p>{locale === 'zh' ? '单位' : 'Unit'} / {product.unit}{isCustom ? (locale === 'zh' ? ' · 专属价' : ' · Custom price') : ''}</p></div><div className="product-price"><span>¥ {Number(price).toFixed(2)}</span><small className={inStock ? 'available' : 'sold-out'}>{inStock ? `${product.stock} ${product.unit} ${locale === 'zh' ? '可售' : 'available'}` : (locale === 'zh' ? '暂时缺货' : 'Out of stock')}</small></div></article>
}
