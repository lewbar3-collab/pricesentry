import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import StatusPill from '@/components/ui/StatusPill'

export default async function AdminProductsPage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: products } = await supabase
    .from('products')
    .select('*, competitor:competitors(*), profile:profiles(email, company_name)')
    .order('created_at', { ascending: false })

  const statusCounts = {
    live: products?.filter(p => p.status === 'live').length ?? 0,
    pending: products?.filter(p => p.status === 'pending').length ?? 0,
    error: products?.filter(p => p.status === 'error').length ?? 0,
    paused: products?.filter(p => p.status === 'paused').length ?? 0,
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>All Products</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>{products?.length ?? 0} total products across all clients</p>
      </div>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Live', count: statusCounts.live, color: 'var(--accent)' },
          { label: 'Pending', count: statusCounts.pending, color: 'var(--amber)' },
          { label: 'Errors', count: statusCounts.error, color: 'var(--red)' },
          { label: 'Paused', count: statusCounts.paused, color: 'var(--text-muted)' },
        ].map(s => (
          <div key={s.label} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>{s.count}</div>
              <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Products table */}
      <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 100px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
          {['Product / URL', 'Client', 'Competitor', 'Last Price', 'Status', 'Actions'].map(h => (
            <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {products?.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No products yet.</div>
        )}

        {products?.map(product => (
          <div key={product.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 100px 80px', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.url}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.profile?.company_name || product.profile?.email}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{product.competitor?.domain}</div>
            <div className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>
              {product.last_price ? `£${product.last_price.toFixed(2)}` : '—'}
            </div>
            <div><StatusPill status={product.status} /></div>
            <div style={{ display: 'flex', gap: 5 }}>
              <a href={product.url} target="_blank" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none' }}>↗</a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
