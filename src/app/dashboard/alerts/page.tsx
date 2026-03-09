import { createClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export default async function AlertsPage() {
  const profile = await requireClient()
  const supabase = await createClient()

  const { data: alertLogs } = await supabase
    .from('alert_logs')
    .select('*, product:products(name, url, competitor:competitors(domain))')
    .order('sent_at', { ascending: false })
    .limit(50)

  const { data: products } = await supabase
    .from('products')
    .select('*, competitor:competitors(name, domain), alert_rules(*)')
    .eq('user_id', profile.id)
    .eq('status', 'live')

  const totalAlerts = alertLogs?.length ?? 0
  const drops = alertLogs?.filter(a => a.change_amount < 0).length ?? 0
  const rises = alertLogs?.filter(a => a.change_amount > 0).length ?? 0

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Alerts</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Your price change notifications</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Alerts', value: totalAlerts, color: 'var(--text)' },
          { label: 'Price Drops', value: drops, color: 'var(--accent)' },
          { label: 'Price Rises', value: rises, color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 22, color: s.color }}>{s.value}</div>
            <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alert rules per product */}
      <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Alert Rules</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>All live products are set to alert on any price change by default</div>
        </div>
        {products?.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No live products yet. Alert rules will appear here once products go live.
          </div>
        )}
        {products?.map(product => (
          <div key={product.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{product.name}</div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{product.competitor?.domain}</div>
              </div>
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.2)', padding: '3px 10px', borderRadius: 6 }}>
              🔔 Any change
            </div>
          </div>
        ))}
      </div>

      {/* Alert log */}
      <div className="animate-fade-up delay-300" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Alert History</div>
        </div>

        {alertLogs?.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No alerts yet — you&apos;ll be notified here and by email when prices change.
          </div>
        )}

        {alertLogs?.map(log => {
          const isUp = log.change_amount > 0
          return (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: isUp ? 'var(--red-dim)' : 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {isUp ? '📈' : '📉'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.product?.name}
                </div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {log.product?.competitor?.domain} · {new Date(log.sent_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: isUp ? 'var(--red)' : 'var(--accent)' }}>
                  {isUp ? '▲' : '▼'} £{Math.abs(log.change_amount).toFixed(2)}
                </div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                  £{log.old_price.toFixed(2)} → £{log.new_price.toFixed(2)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
