import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'
import StatCard from '@/components/ui/StatCard'
import ClientRefreshButton from '@/components/ui/ClientRefreshButton'
import type { CompetitorProduct, Competitor } from '@/types'

type CpWithCompetitor = CompetitorProduct & { competitor: Competitor | null }

const TAG_COLOURS = [
  { bg: 'rgba(0,229,160,0.12)', text: 'var(--accent)', border: 'rgba(0,229,160,0.25)' },
  { bg: 'rgba(167,139,250,0.12)', text: 'var(--purple)', border: 'rgba(167,139,250,0.25)' },
  { bg: 'rgba(77,159,255,0.12)', text: '#4d9fff', border: 'rgba(77,159,255,0.25)' },
  { bg: 'rgba(255,184,63,0.12)', text: 'var(--amber)', border: 'rgba(255,184,63,0.25)' },
  { bg: 'rgba(255,77,106,0.12)', text: 'var(--red)', border: 'rgba(255,77,106,0.25)' },
]
function tagColour(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return TAG_COLOURS[Math.abs(h) % TAG_COLOURS.length]
}

export default async function DashboardPage() {
  const profile = await requireClient()
  const supabase = await createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, competitor_products(*, competitor:competitors(id, name, domain, delivery_cost, free_delivery_threshold, is_own_company))')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const allCps = (products?.flatMap(p => p.competitor_products ?? []) ?? []) as CpWithCompetitor[]
  const liveCps = allCps.filter(cp => cp.status === 'live')
  const pendingCps = allCps.filter(cp => cp.status === 'pending')

  // Unique competitors for refresh buttons
  const liveCompetitors = [...new Map(
    liveCps.map(cp => [cp.competitor_id, cp.competitor])
  ).entries()].map(([id, c]) => ({ id, name: c?.name ?? '', domain: c?.domain ?? '' }))

  // Price changes
  const cpIds = liveCps.map(cp => cp.id)
  const { data: recentHistory } = cpIds.length
    ? await supabase
        .from('price_history')
        .select('competitor_product_id, price')
        .in('competitor_product_id', cpIds)
        .order('scraped_at', { ascending: false })
        .limit(200)
    : { data: [] }

  const prevPrices: Record<string, number> = {}
  const seen = new Set<string>()
  for (const h of recentHistory ?? []) {
    if (!h.competitor_product_id) continue
    if (!seen.has(h.competitor_product_id)) { seen.add(h.competitor_product_id); continue }
    if (!prevPrices[h.competitor_product_id]) prevPrices[h.competitor_product_id] = h.price
  }

  const priceDrops = liveCps.filter(cp => cp.last_price && prevPrices[cp.id] && cp.last_price < prevPrices[cp.id]).length
  const priceRises = liveCps.filter(cp => cp.last_price && prevPrices[cp.id] && cp.last_price > prevPrices[cp.id]).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Intelligence Dashboard</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Monitoring {liveCps.length} competitor prices across {products?.length ?? 0} products
            {pendingCps.length > 0 && <span style={{ color: 'var(--amber)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}> · {pendingCps.length} pending setup</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ClientRefreshButton competitorIds={liveCompetitors.map(c => c.id)} />
          <a href="/dashboard/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border-bright)', textDecoration: 'none' }}>
            📦 Manage Products
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Price Drops" value={priceDrops} sub="since last check" color="green" delay={0.15} />
        <StatCard label="Price Rises" value={priceRises} sub="since last check" color="red" delay={0.2} />
        <StatCard label="Prices Tracked" value={liveCps.length} sub={`across ${products?.length ?? 0} products`} color="amber" delay={0.25} />
        <StatCard label="Pending Setup" value={pendingCps.length} sub="awaiting admin config" color="blue" delay={0.3} />
      </div>

      {/* Product cards */}
      {(!products || products.length === 0) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No products yet. <a href="/dashboard/products" style={{ color: 'var(--accent)' }}>Add your first product</a> to start tracking.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {products?.map((product, pi) => {
          const cps = (product.competitor_products ?? []) as CpWithCompetitor[]
          const lowestPrice = cps.length ? Math.min(...cps.filter(cp => cp.last_price).map(cp => Number(cp.last_price))) : null
          const cat = product.category
          const catColour = cat ? tagColour(cat) : null

          return (
            <div key={product.id} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', animationDelay: `${pi * 0.04}s` }}>

              {/* Header */}
              <div style={{ display: 'flex', gap: 0 }}>
                {product.image_url && (
                  <div style={{ width: 90, flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  </div>
                )}
                <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{product.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {cat && catColour && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: catColour.bg, color: catColour.text, border: `1px solid ${catColour.border}`, fontFamily: 'DM Mono, monospace' }}>{cat}</span>
                      )}
                      <span className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{cps.length} competitor{cps.length !== 1 ? 's' : ''} tracked</span>
                    </div>
                  </div>
                  {lowestPrice !== null && lowestPrice !== Infinity && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Lowest competitor</div>
                      <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>£{lowestPrice.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Competitor rows */}
              {cps.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px', padding: '8px 18px', borderBottom: '1px solid var(--border)' }}>
                    {['Competitor', 'Current Price', 'Delivery', 'Last Checked', 'Status'].map(h => (
                      <div key={h} className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {cps.map((cp, i) => {
                    const prevPrice = prevPrices[cp.id]
                    const change = cp.last_price && prevPrice ? Number(cp.last_price) - prevPrice : null
                    const isLow = lowestPrice !== null && cp.last_price && Number(cp.last_price) === lowestPrice && cps.filter(c => c.last_price).length > 1
                    return (
                      <div key={cp.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 90px', alignItems: 'center', padding: '11px 18px', borderBottom: i < cps.length - 1 ? '1px solid var(--border)' : 'none', background: isLow ? 'rgba(0,229,160,0.03)' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#4d9fff,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {cp.competitor?.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{cp.competitor?.name}</div>
                            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cp.competitor?.domain}</div>
                          </div>
                          {isLow && <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.2)', padding: '1px 6px', borderRadius: 4 }}>lowest</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="font-mono" style={{ fontSize: 14, fontWeight: 600 }}>
                            {cp.last_price ? `£${Number(cp.last_price).toFixed(2)}` : '—'}
                          </span>
                          {change !== null && (
                            <span className="font-mono" style={{ fontSize: 10, color: change < 0 ? 'var(--accent)' : 'var(--red)' }}>
                              {change < 0 ? '▼' : '▲'}£{Math.abs(change).toFixed(2)}
                            </span>
                          )}
                        </div>
                        {/* Delivery */}
                        <div>
                          {cp.competitor?.delivery_cost !== null && cp.competitor?.delivery_cost !== undefined ? (
                            <div>
                              <span className="font-mono" style={{ fontSize: 12, color: 'var(--purple)' }}>
                                £{Number(cp.competitor.delivery_cost).toFixed(2)}
                              </span>
                              {cp.competitor.free_delivery_threshold !== null && cp.competitor.free_delivery_threshold !== undefined && (
                                <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 1 }}>
                                  free &gt;£{Number(cp.competitor.free_delivery_threshold).toFixed(0)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.4 }}>—</span>
                          )}
                        </div>
                        <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {cp.last_scraped_at ? (() => {
                            const diff = Math.floor((Date.now() - new Date(cp.last_scraped_at).getTime()) / 60000)
                            if (diff < 1) return 'just now'
                            if (diff < 60) return `${diff}m ago`
                            if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
                            return `${Math.floor(diff / 1440)}d ago`
                          })() : '—'}
                        </div>
                        <div>
                          <span className="font-mono" style={{ fontSize: 10, color: cp.status === 'live' ? 'var(--accent)' : cp.status === 'error' ? 'var(--red)' : 'var(--amber)', background: cp.status === 'live' ? 'var(--accent-dim)' : cp.status === 'error' ? 'rgba(255,77,106,0.1)' : 'var(--amber-dim)', border: `1px solid ${cp.status === 'live' ? 'rgba(0,229,160,0.2)' : cp.status === 'error' ? 'rgba(255,77,106,0.2)' : 'rgba(255,184,63,0.2)'}`, padding: '3px 8px', borderRadius: 5 }}>
                            {cp.status}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {cps.length === 0 && (
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                  No competitor URLs yet — <a href="/dashboard/products" style={{ color: 'var(--accent)' }}>add some</a>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
