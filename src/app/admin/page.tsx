import { createAdminClient } from '@/lib/supabase/server'
import StatCard from '@/components/ui/StatCard'
import AdminQueuePanel from '@/components/admin/AdminQueuePanel'

export default async function AdminPage() {
  const supabase = await createAdminClient()

  const { data: allCompetitors } = await supabase
    .from('competitors')
    .select('*, competitor_products(*), profile:profiles(email, company_name)')
    .order('created_at', { ascending: true })

  // Pending = no selector set yet, AND has at least one competitor_product assigned
  // OR no selector and was just created (show all unconfigured)
  const isConfigured = (c: { sale_price_selector: string | null; price_selector: string | null }) =>
    !!(c.sale_price_selector || c.price_selector)

  const pendingCompetitors = allCompetitors?.filter(c => !isConfigured(c)) ?? []
  const liveCompetitors = allCompetitors?.filter(c => isConfigured(c)) ?? []
  const errorCompetitors = allCompetitors?.filter(c =>
    c.competitor_products?.some((cp: { status: string }) => cp.status === 'error')
  ) ?? []

  const { count: liveProductCount } = await supabase
    .from('products').select('*', { count: 'exact', head: true }).eq('status', 'live')

  const { count: clientCount } = await supabase
    .from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client')

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const { data: scrapeJobs } = await supabase
    .from('scrape_jobs').select('status').gte('created_at', today.toISOString())

  const totalToday = scrapeJobs?.length ?? 0
  const successToday = scrapeJobs?.filter(j => j.status === 'success').length ?? 0
  const successRate = totalToday > 0 ? ((successToday / totalToday) * 100).toFixed(1) : '—'

  const { data: recentJobs } = await supabase
    .from('scrape_jobs')
    .select('*, product:products(name, url, competitor:competitors(domain))')
    .order('created_at', { ascending: false })
    .limit(12)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Setup Queue</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {pendingCompetitors.length} competitor{pendingCompetitors.length !== 1 ? 's' : ''} awaiting configuration
            {pendingCompetitors.length > 0 && <span style={{ color: 'var(--amber)', fontFamily: 'DM Mono, monospace', fontSize: 12 }}> · configure selector to activate all products</span>}
          </p>
        </div>
        <a href="/admin/logs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border-bright)', textDecoration: 'none' }}>
          📋 Scrape Logs
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Pending Setup" value={pendingCompetitors.length} sub="competitors to configure" color="amber" delay={0.15} />
        <StatCard label="Live Products" value={liveProductCount ?? 0} sub={`${errorCompetitors.length} with errors`} color="green" delay={0.2} />
        <StatCard label="Total Clients" value={clientCount ?? 0} sub="registered" color="blue" delay={0.25} />
        <StatCard label="Scrapes Today" value={totalToday} sub={`${successRate}% success rate`} color="purple" delay={0.3} />
      </div>

      <div className="animate-fade-up delay-300">
        <AdminQueuePanel pendingCompetitors={pendingCompetitors} liveCompetitors={liveCompetitors} />
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
                    const diff = Math.floor((Date.now() - new Date(job.created_at).getTime()) / 60000)
                    return diff < 1 ? 'just now' : `${diff}m ago`
                  })()}
                </div>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: isErr ? 'var(--red)' : isWarn ? 'var(--amber)' : 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, color: isErr ? 'var(--red)' : 'var(--text-dim)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: isErr ? 'var(--red)' : 'var(--text)' }}>{job.product?.competitor?.domain}</strong>
                  {' · '}{job.product?.name}
                  {isErr && ' · selector failed'}
                  {isWarn && !isErr && ` · slow ${(job.duration_ms! / 1000).toFixed(1)}s`}
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: isErr ? 'var(--red)' : 'var(--accent)', flexShrink: 0 }}>
                  {isErr ? 'ERR' : job.price_found ? `£${Number(job.price_found).toFixed(2)}` : '—'}
                </div>
              </div>
            )
          })}
          {!recentJobs?.length && (
            <div style={{ padding: '24px 20px', color: 'var(--text-muted)', fontSize: 12, gridColumn: 'span 2', textAlign: 'center' }}>
              No scrape jobs yet — use Refresh on a live competitor or wait for the hourly cron.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
