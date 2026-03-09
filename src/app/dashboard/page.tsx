import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'
import StatCard from '@/components/ui/StatCard'
import StatusPill from '@/components/ui/StatusPill'
import ChangePill from '@/components/ui/ChangePill'

export default async function DashboardPage() {
  const profile = await requireClient()
  const supabase = await createClient()

  // Fetch products with competitor data
  const { data: products } = await supabase
    .from('products')
    .select('*, competitor:competitors(name, domain)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch recent price history to determine changes
  const productIds = products?.map(p => p.id) ?? []
  const { data: recentHistory } = productIds.length
    ? await supabase
        .from('price_history')
        .select('*')
        .in('product_id', productIds)
        .order('scraped_at', { ascending: false })
        .limit(100)
    : { data: [] }

  // Compute stats
  const liveProducts = products?.filter(p => p.status === 'live') ?? []
  const pendingProducts = products?.filter(p => p.status === 'pending') ?? []

  // Get previous prices per product
  const prevPrices: Record<string, number> = {}
  const seenProducts = new Set<string>()
  for (const h of recentHistory ?? []) {
    if (!seenProducts.has(h.product_id)) {
      seenProducts.add(h.product_id)
      continue
    }
    if (!prevPrices[h.product_id]) {
      prevPrices[h.product_id] = h.price
    }
  }

  const priceDrops = liveProducts.filter(p => p.last_price && prevPrices[p.id] && p.last_price < prevPrices[p.id]).length
  const priceRises = liveProducts.filter(p => p.last_price && prevPrices[p.id] && p.last_price > prevPrices[p.id]).length

  // Recent alerts
  const { data: alertLogs } = await supabase
    .from('alert_logs')
    .select('*, product:products(name, url)')
    .order('sent_at', { ascending: false })
    .limit(6)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>
            Intelligence Dashboard
          </h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Monitoring {liveProducts.length} products
            {pendingProducts.length > 0 && <span style={{ color: 'var(--amber)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}> · {pendingProducts.length} pending setup</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/dashboard/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border-bright)', textDecoration: 'none' }}>
            📦 Products
          </a>
          <a href="/dashboard/competitors/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#060810', textDecoration: 'none' }}>
            ＋ Add Product
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Price Drops" value={priceDrops} sub="last check" color="green" delay={0.15} />
        <StatCard label="Price Rises" value={priceRises} sub="last check" color="red" delay={0.2} />
        <StatCard label="Watching" value={liveProducts.length} sub={`across ${new Set(products?.map(p => p.competitor_id)).size} competitors`} color="amber" delay={0.25} />
        <StatCard label="Pending Setup" value={pendingProducts.length} sub="awaiting admin config" color="blue" delay={0.3} />
      </div>

      {/* Products table */}
      <div className="animate-fade-up delay-300" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Tracked Products</div>
          <a href="/dashboard/products" className="font-mono" style={{ fontSize: 10.5, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
        </div>

        {/* Table head */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Product', 'Current Price', 'Previous', 'Change', 'Status'].map(h => (
            <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {products?.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No products yet. <a href="/dashboard/competitors/new" style={{ color: 'var(--accent)' }}>Add a competitor</a> to get started.
          </div>
        )}

        {products?.map(product => {
          const prevPrice = prevPrices[product.id] ?? null
          return (
            <div
              key={product.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>📦</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{product.name}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{product.competitor?.domain}</div>
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>
                {product.last_price ? `£${product.last_price.toFixed(2)}` : '—'}
              </div>
              <div className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {prevPrice ? `£${prevPrice.toFixed(2)}` : '—'}
              </div>
              <div><ChangePill oldPrice={prevPrice} newPrice={product.last_price} /></div>
              <div><StatusPill status={product.status} /></div>
            </div>
          )
        })}
      </div>

      {/* Recent alerts */}
      {alertLogs && alertLogs.length > 0 && (
        <div className="animate-fade-up delay-400" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Recent Alerts</div>
            <a href="/dashboard/alerts" className="font-mono" style={{ fontSize: 10.5, color: 'var(--accent)', textDecoration: 'none' }}>View all →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {alertLogs.map(log => {
              const isUp = log.change_amount > 0
              return (
                <div key={log.id} style={{ display: 'flex', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: isUp ? 'var(--red-dim)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0, marginTop: 1 }}>
                    {isUp ? '📈' : '📉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.product?.name}
                    </div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
                      <span style={{ color: isUp ? 'var(--red)' : 'var(--accent)' }}>
                        {isUp ? '▲' : '▼'} £{Math.abs(log.change_amount).toFixed(2)}
                      </span>
                      <span>{new Date(log.sent_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
