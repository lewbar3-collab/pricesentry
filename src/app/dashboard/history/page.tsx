import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'
import ClientRefreshButton from '@/components/ui/ClientRefreshButton'

export default async function HistoryPage() {
  const profile = await requireClient()
  const supabase = await createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, competitor:competitors(name, domain, id)')
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
  type HistoryEntry = NonNullable<typeof history>[number]
  const historyByProduct: Record<string, HistoryEntry[]> = {}
  for (const h of history ?? []) {
    if (!historyByProduct[h.product_id]) historyByProduct[h.product_id] = []
    historyByProduct[h.product_id]!.push(h)
  }

  // Unique competitors for refresh buttons
  const liveCompetitors = [...new Map(
    (products ?? [] as {competitor_id: string, competitor: {name: string, domain: string, id: string}}[]).map(p => [p.competitor_id, p.competitor])
  ).entries()].map(([id, c]) => ({ id, ...c }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Price History</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Full price timeline for all tracked products</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {liveCompetitors.map(c => (
            <ClientRefreshButton key={c.id} competitorId={c.id} label={c.name || c.domain} />
          ))}
        </div>
      </div>

      {(!products || products.length === 0) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No live products yet — price history will appear here once your products are configured and scraped.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {products?.map((product, pi) => {
          const entries = historyByProduct[product.id] ?? []
          const minPrice = entries.length ? Math.min(...entries.map(e => Number(e.price))) : 0
          const maxPrice = entries.length ? Math.max(...entries.map(e => Number(e.price))) : 0
          const latest = entries[0]
          const previous = entries[1]
          const change = latest && previous ? Number(latest.price) - Number(previous.price) : null

          return (
            <div key={product.id} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', animationDelay: `${0.1 + pi * 0.05}s` }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{product.name}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{product.competitor?.domain}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {change !== null && (
                    <div className="font-mono" style={{ fontSize: 12, color: change < 0 ? 'var(--accent)' : change > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                      {change < 0 ? '▼' : change > 0 ? '▲' : '—'} £{Math.abs(change).toFixed(2)}
                    </div>
                  )}
                  <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                    {latest ? `£${Number(latest.price).toFixed(2)}` : '—'}
                  </div>
                </div>
              </div>

              {entries.length === 0 ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                  No price history yet — waiting for first scrape
                </div>
              ) : (
                <>
                  {/* Mini sparkline using CSS */}
                  {entries.length > 1 && (
                    <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
                      {entries.slice(0, 30).reverse().map((e, i) => {
                        const pct = maxPrice > minPrice ? ((Number(e.price) - minPrice) / (maxPrice - minPrice)) * 100 : 50
                        const isLatest = i === entries.slice(0, 30).length - 1
                        return (
                          <div
                            key={e.id}
                            title={`£${Number(e.price).toFixed(2)} — ${new Date(e.scraped_at).toLocaleString('en-GB')}`}
                            style={{
                              flex: 1, borderRadius: '2px 2px 0 0',
                              background: isLatest ? 'var(--accent)' : 'var(--surface2)',
                              height: `${Math.max(15, pct)}%`,
                              transition: 'background 0.15s',
                              cursor: 'default',
                            }}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Price log */}
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {entries.slice(0, 20).map((entry, i) => {
                      const prev = entries[i + 1]
                      const diff = prev ? Number(entry.price) - Number(prev.price) : null
                      return (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', padding: '9px 20px', borderBottom: '1px solid var(--border)', gap: 16 }}>
                          <div className="font-mono" style={{ fontSize: 11, fontWeight: 600, minWidth: 70 }}>
                            £{Number(entry.price).toFixed(2)}
                          </div>
                          {diff !== null && (
                            <div className="font-mono" style={{ fontSize: 10, color: diff < 0 ? 'var(--accent)' : diff > 0 ? 'var(--red)' : 'var(--text-muted)', minWidth: 60 }}>
                              {diff === 0 ? 'no change' : `${diff < 0 ? '▼' : '▲'} £${Math.abs(diff).toFixed(2)}`}
                            </div>
                          )}
                          {i === 0 && <div className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 7px', borderRadius: 4 }}>latest</div>}
                          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {new Date(entry.scraped_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ padding: '10px 20px', display: 'flex', gap: 20 }}>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      Low: <span style={{ color: 'var(--accent)' }}>£{minPrice.toFixed(2)}</span>
                    </div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      High: <span style={{ color: 'var(--red)' }}>£{maxPrice.toFixed(2)}</span>
                    </div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {entries.length} data point{entries.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
