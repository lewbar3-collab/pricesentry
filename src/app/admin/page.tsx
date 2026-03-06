import { createAdminClient } from '@/lib/supabase/server'
import StatCard from '@/components/ui/StatCard'
import StatusPill from '@/components/ui/StatusPill'
import AdminConfigurePanel from '@/components/admin/AdminConfigurePanel'

export default async function AdminPage() {
  const supabase = await createAdminClient()

  // All products with their client and competitor info
  const { data: allProducts } = await supabase
    .from('products')
    .select('*, competitor:competitors(*), profile:profiles(email, company_name)')
    .order('created_at', { ascending: true })

  const pending = allProducts?.filter(p => p.status === 'pending') ?? []
  const live = allProducts?.filter(p => p.status === 'live') ?? []
  const errors = allProducts?.filter(p => p.status === 'error') ?? []

  // Client count
  const { count: clientCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'client')

  // Scrapes today
  const today = new Date(); today.setHours(0,0,0,0)
  const { data: scrapeJobs } = await supabase
    .from('scrape_jobs')
    .select('status')
    .gte('created_at', today.toISOString())

  const totalToday = scrapeJobs?.length ?? 0
  const successToday = scrapeJobs?.filter(j => j.status === 'success').length ?? 0
  const successRate = totalToday > 0 ? ((successToday / totalToday) * 100).toFixed(1) : '—'

  // Recent scrape log
  const { data: recentJobs } = await supabase
    .from('scrape_jobs')
    .select('*, product:products(name, url, competitor:competitors(domain))')
    .order('created_at', { ascending: false })
    .limit(12)

  // First pending product to configure
  const firstPending = pending[0] ?? null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Setup Queue</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {pending.length} products awaiting configuration
            {pending.length > 0 && <span style={{ color: 'var(--amber)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}> · configure to go live</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/admin/logs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border-bright)', textDecoration: 'none' }}>
            📋 Scrape Logs
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Pending Setup" value={pending.length} sub="awaiting config" color="amber" delay={0.15} />
        <StatCard label="Live Products" value={live.length} sub={`${errors.length} errors`} color="green" delay={0.2} />
        <StatCard label="Total Clients" value={clientCount ?? 0} sub="registered" color="blue" delay={0.25} />
        <StatCard label="Scrapes Today" value={totalToday} sub={`${successRate}% success rate`} color="purple" delay={0.3} />
      </div>

      {/* Main content: Queue + Configure Panel */}
      <div className="animate-fade-up delay-300" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, marginBottom: 20 }}>

        {/* Queue table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>📥 Pending Configuration</div>
            <span className="font-mono" style={{ fontSize: 9, background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,184,63,0.2)', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>
              {pending.length} items
            </span>
          </div>

          {/* Head */}
          <div style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1.2fr 1fr 90px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
            {['', 'Product / URL', 'Client', 'Submitted', 'Status', 'Actions'].map(h => (
              <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {pending.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              🎉 Queue is empty — all products are configured!
            </div>
          )}

          {[...pending, ...errors].map((product, i) => {
            const isFirst = i === 0
            const isError = product.status === 'error'
            return (
              <div
                key={product.id}
                style={{
                  display: 'grid', gridTemplateColumns: '24px 2fr 1.2fr 1fr 90px 80px',
                  alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border)',
                  gap: 12,
                  background: isFirst ? 'rgba(167,139,250,0.04)' : 'transparent',
                  borderLeft: isFirst ? '2px solid var(--purple)' : '2px solid transparent',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isError ? 'var(--red)' : isFirst ? 'var(--red)' : 'var(--amber)', boxShadow: isFirst ? '0 0 6px rgba(255,77,106,0.4)' : 'none' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.url}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-dim)' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg,#4d9fff,#00e5a0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                    {(product.profile?.company_name || product.profile?.email || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.profile?.company_name || product.profile?.email}
                  </span>
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {(() => {
                    const d = new Date(product.created_at)
                    const now = new Date()
                    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60)
                    if (diff < 60) return `${diff}m ago`
                    if (diff < 1440) return `${Math.floor(diff/60)}h ago`
                    return 'Yesterday'
                  })()}
                </div>
                <div><StatusPill status={isFirst ? 'configuring' : product.status} /></div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <a href={product.url} target="_blank" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none' }}>↗</a>
                </div>
              </div>
            )
          })}
        </div>

        {/* Configure panel */}
        <AdminConfigurePanel product={firstPending} />
      </div>

      {/* Scrape Log */}
      <div className="animate-fade-up delay-400" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 2s infinite' }} />
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Live Scrape Log</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {recentJobs?.map(job => {
            const isErr = job.status === 'error'
            const isWarn = job.duration_ms && job.duration_ms > 3000
            return (
              <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, width: 55 }}>
                  {(() => {
                    const d = new Date(job.created_at)
                    const now = new Date()
                    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60)
                    return diff < 1 ? 'just now' : `${diff}m ago`
                  })()}
                </div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isErr ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, color: isErr ? 'var(--red)' : 'var(--text-dim)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: isErr ? 'var(--red)' : 'var(--text)' }}>{job.product?.competitor?.domain}</strong>
                  {' · '}{job.product?.name}
                  {isErr && ' · selector failed'}
                  {isWarn && !isErr && ` · slow ${(job.duration_ms!/1000).toFixed(1)}s`}
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: isErr ? 'var(--red)' : 'var(--accent)', flexShrink: 0 }}>
                  {isErr ? 'ERR' : job.price_found ? `£${Number(job.price_found).toFixed(2)}` : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
