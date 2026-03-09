import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import StatusPill from '@/components/ui/StatusPill'

export default async function AdminErrorsPage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: errorProducts } = await supabase
    .from('products')
    .select('*, competitor:competitors(*), profile:profiles(email, company_name)')
    .eq('status', 'error')
    .order('last_scraped_at', { ascending: false })

  const { data: recentErrors } = await supabase
    .from('scrape_jobs')
    .select('*, product:products(name, url, competitor:competitors(domain))')
    .eq('status', 'error')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>
          Errors
        </h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          {errorProducts?.length ?? 0} products with scrape errors
        </p>
      </div>

      {/* Error products */}
      <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Products with errors</div>
          <span className="font-mono" style={{ fontSize: 9, background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,106,0.2)', padding: '2px 7px', borderRadius: 10 }}>
            {errorProducts?.length ?? 0}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 120px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
          {['Product / URL', 'Client', 'Last Attempt', 'Status', 'Actions'].map(h => (
            <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {errorProducts?.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            🎉 No errors — all scrapers are running cleanly!
          </div>
        )}

        {errorProducts?.map(product => (
          <div key={product.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 120px 80px', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border)', gap: 12, borderLeft: '2px solid var(--red)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.url}</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.profile?.company_name || product.profile?.email}
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {product.last_scraped_at ? new Date(product.last_scraped_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
            </div>
            <div><StatusPill status="error" /></div>
            <div style={{ display: 'flex', gap: 5 }}>
              <a href={product.url} target="_blank" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none' }}>↗</a>
            </div>
          </div>
        ))}
      </div>

      {/* Recent error log */}
      <div className="animate-fade-up delay-300" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Recent Error Log</div>
        </div>
        {recentErrors?.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No errors recorded yet.</div>
        )}
        {recentErrors?.map(job => (
          <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, width: 110 }}>
              {new Date(job.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: 'var(--text)' }}>{job.product?.competitor?.domain}</span>
              {' · '}
              <span style={{ color: 'var(--text-dim)' }}>{job.product?.name}</span>
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.error_message || 'Unknown error'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
