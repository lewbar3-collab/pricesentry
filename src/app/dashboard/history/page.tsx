import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'
import StatusPill from '@/components/ui/StatusPill'

export default async function HistoryPage() {
  const profile = await requireClient()
  const supabase = await createClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, competitor:competitors(name, domain)')
    .eq('user_id', profile.id)
    .eq('status', 'live')
    .order('created_at', { ascending: false })

  const productIds = products?.map(p => p.id) ?? []

  const { data: history } = productIds.length
    ? await supabase
        .from('price_history')
        .select('*')
        .in('product_id', productIds)
        .order('scraped_at', { ascending: false })
        .limit(200)
    : { data: [] }

  // Group history by product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historyByProduct: Record<string, any[]> = {}
  for (const h of history ?? []) {
    if (!historyByProduct[h.product_id]) historyByProduct[h.product_id] = []
    historyByProduct[h.product_id]!.push(h)
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Price History</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Price trends across {products?.length ?? 0} tracked products
        </p>
      </div>

      {products?.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No live products yet. History will appear once your products are configured and scraped.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {products?.map((product, i) => {
          const productHistory = historyByProduct[product.id] ?? []
          const latest = productHistory[0]
          const oldest = productHistory[productHistory.length - 1]
          const priceChange = latest && oldest && latest.price !== oldest.price
            ? latest.price - oldest.price : null
          const prices = productHistory.map(h => h.price).filter(Boolean)
          const minPrice = prices.length ? Math.min(...prices) : null
          const maxPrice = prices.length ? Math.max(...prices) : null

          return (
            <div key={product.id} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', animationDelay: `${0.1 + i * 0.05}s` }}>
              {/* Product header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📦</div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{product.name}</div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{product.competitor?.domain}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {priceChange !== null && (
                    <div className="font-mono" style={{ fontSize: 12, color: priceChange < 0 ? 'var(--accent)' : 'var(--red)', fontWeight: 500 }}>
                      {priceChange < 0 ? '▼' : '▲'} £{Math.abs(priceChange).toFixed(2)} overall
                    </div>
                  )}
                  {minPrice && maxPrice && (
                    <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      £{minPrice.toFixed(2)} — £{maxPrice.toFixed(2)}
                    </div>
                  )}
                  <StatusPill status={product.status} />
                </div>
              </div>

              {/* Mini sparkline */}
              {prices.length > 1 && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 48 }}>
                    {prices.slice(0, 30).reverse().map((price, idx) => {
                      const range = maxPrice! - minPrice! || 1
                      const height = Math.max(((price - minPrice!) / range) * 44 + 4, 4)
                      const isLatest = idx === prices.slice(0, 30).length - 1
                      return (
                        <div key={idx} style={{ flex: 1, height, background: isLatest ? 'var(--accent)' : 'rgba(0,229,160,0.3)', borderRadius: '2px 2px 0 0' }} title={`£${price.toFixed(2)}`} />
                      )
                    })}
                  </div>
                </div>
              )}

              {/* History rows */}
              <div>
                {productHistory.slice(0, 10).map((h, idx) => {
                  const prev = productHistory[idx + 1]
                  const change = prev ? h.price - prev.price : null
                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 16, fontSize: 12 }}>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', width: 130, flexShrink: 0 }}>
                        {new Date(h.scraped_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="font-mono" style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                        £{h.price.toFixed(2)}
                      </div>
                      {change !== null && Math.abs(change) > 0 && (
                        <div className="font-mono" style={{ fontSize: 11, color: change < 0 ? 'var(--accent)' : 'var(--red)', background: change < 0 ? 'var(--accent-dim)' : 'var(--red-dim)', padding: '2px 8px', borderRadius: 4 }}>
                          {change < 0 ? '▼' : '▲'} £{Math.abs(change).toFixed(2)}
                        </div>
                      )}
                      {change === 0 && <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>no change</div>}
                    </div>
                  )
                })}
                {productHistory.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    No price history yet — will populate after first scrape.
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
