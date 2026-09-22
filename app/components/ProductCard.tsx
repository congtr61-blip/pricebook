type ProductCardProps = { product: { name: string; unit: string; base_price: number; stock: number }; price: number; isCustom?: boolean }

export function ProductCard({ product, price, isCustom }: ProductCardProps) {
  const inStock = product.stock > 0
  return <article className="product-card"><div className="product-number">{String(product.stock).padStart(2, '0')}</div><div className="product-info"><h3>{product.name}</h3><p>单位 / {product.unit}{isCustom ? ' · 专属价' : ''}</p></div><div className="product-price"><span>¥ {Number(price).toFixed(2)}</span><small className={inStock ? 'available' : 'sold-out'}>{inStock ? `${product.stock} ${product.unit} 可售` : '暂时缺货'}</small></div></article>
}
