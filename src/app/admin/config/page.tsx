import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

export default async function AdminConfigPage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: competitors } = await supabase
    .from('competitors')
    .select('*, products(count), profile:profiles(email, company_name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Scraper Config</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {competitors?.length ?? 0} competitors configured
        </p>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {competitors?.length === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No competitors yet. Clients add competitors from their dashboard.
          </div>
        )}

        {competitors?.map((competitor, i) => {
          const productCount = competitor.products?.[0]?.count ?? 0
          const hasSelector = !!(competitor.sale_price_selector || competitor.price_selector)
          return (
            <div key={competitor.id} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '20px 24px', animationDelay: `${0.1 + i * 0.05}s` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{competitor.name}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {competitor.domain} · {productCount} products · {competitor.profile?.company_name || competitor.profile?.email}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="font-mono" style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: hasSelector ? 'var(--accent-dim)' : 'var(--amber-dim)', color: hasSelector ? 'var(--accent)' : 'var(--amber)', border: `1px solid ${hasSelector ? 'rgba(0,229,160,0.2)' : 'rgba(255,184,63,0.2)'}` }}>
                    {hasSelector ? '✓ Configured' : '⚠ Needs Setup'}
                  </span>
                  <a href={`https://${competitor.domain}`} target="_blank" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none' }}>↗</a>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Price Selector</div>
                  <div className="font-mono" style={{ fontSize: 11.5, color: hasSelector ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {competitor.sale_price_selector || competitor.price_selector || 'Not set'}
                  </div>
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Scrape Method</div>
                  <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--text)' }}>
                    {competitor.scrape_method || 'fetch'}
                  </div>
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                  <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Check Frequency</div>
                  <div className="font-mono" style={{ fontSize: 11.5, color: 'var(--text)' }}>
                    Every {competitor.check_frequency_hours || 6}h
                  </div>
                </div>
              </div>

              {competitor.notes && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-dim)' }}>
                  📝 {competitor.notes}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
