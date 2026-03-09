import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

export default async function AdminLogsPage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: jobs } = await supabase
    .from('scrape_jobs')
    .select('*, product:products(name, url, competitor:competitors(domain))')
    .order('created_at', { ascending: false })
    .limit(100)

  const total = jobs?.length ?? 0
  const success = jobs?.filter(j => j.status === 'success').length ?? 0
  const errors = jobs?.filter(j => j.status === 'error').length ?? 0
  const avgDuration = jobs?.filter(j => j.duration_ms).reduce((acc, j) => acc + j.duration_ms, 0) / (jobs?.filter(j => j.duration_ms).length || 1)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Scrape Logs</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Last 100 scrape jobs</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', value: total, color: 'var(--text)' },
          { label: 'Success', value: success, color: 'var(--accent)' },
          { label: 'Errors', value: errors, color: 'var(--red)' },
          { label: 'Avg Duration', value: `${(avgDuration / 1000).toFixed(1)}s`, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 22, color: s.color }}>{s.value}</div>
            <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Log table */}
      <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 16px 2fr 1fr 90px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
          {['Time', '', 'Product', 'Domain', 'Price', 'Duration'].map(h => (
            <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {jobs?.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No scrape jobs yet. Jobs appear once the cron runs.</div>
        )}

        {jobs?.map(job => {
          const isErr = job.status === 'error'
          const isSlow = job.duration_ms && job.duration_ms > 3000
          return (
            <div key={job.id} style={{ display: 'grid', gridTemplateColumns: '140px 16px 2fr 1fr 90px 80px', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
              <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {new Date(job.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: isErr ? 'var(--red)' : isSlow ? 'var(--amber)' : 'var(--accent)', flexShrink: 0 }} />
              <div style={{ minWidth: 0, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isErr ? 'var(--red)' : 'var(--text)' }}>
                {job.product?.name || '—'}
                {isErr && <span style={{ color: 'var(--red)', fontSize: 11 }}> · {job.error_message}</span>}
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.product?.competitor?.domain || '—'}</div>
              <div className="font-mono" style={{ fontSize: 12, color: isErr ? 'var(--red)' : 'var(--accent)', fontWeight: 500 }}>
                {isErr ? 'ERR' : job.price_found ? `£${Number(job.price_found).toFixed(2)}` : '—'}
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: isSlow ? 'var(--amber)' : 'var(--text-muted)' }}>
                {job.duration_ms ? `${(job.duration_ms / 1000).toFixed(1)}s` : '—'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
