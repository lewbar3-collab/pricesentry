import { createAdminClient } from '@/lib/supabase/server'
import StatCard from '@/components/ui/StatCard'
import AdminConfigurePanel from '@/components/admin/AdminConfigurePanel'
import RefreshButton from '@/components/admin/RefreshButton'

export default async function AdminPage() {
  const supabase = await createAdminClient()

  const { data: allCompetitors } = await supabase
    .from('competitors')
    .select('*, products(*), profile:profiles(email, company_name)')
    .order('created_at', { ascending: true })

  const pendingCompetitors = allCompetitors?.filter(c =>
    !c.price_selector && c.products?.some((p: { status: string }) => p.status === 'pending')
  ) ?? []

  const liveCompetitors = allCompetitors?.filter(c => c.price_selector) ?? []
  const errorCompetitors = allCompetitors?.filter(c =>
    c.products?.some((p: { status: string }) => p.status === 'error')
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

  const firstPending = pendingCompetitors[0] ?? null
  const sampleProduct = firstPending?.products?.find((p: { status: string }) => p.status === 'pending') ?? null

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

      <div className="animate-fade-up delay-300" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, marginBottom: 20 }}>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>📥 Pending Configuration</div>
            <span className="font-mono" style={{ fontSize: 9, background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,184,63,0.2)', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>
              {pendingCompetitors.length} competitors
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1.5fr 80px 1fr 60px', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
            {['', 'Competitor', 'Client', 'Products', 'Submitted', 'Visit'].map(h => (
              <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
            ))}
          </div>

          {pendingCompetitors.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              🎉 Queue is empty — all competitors are configured!
            </div>
          )}

          {pendingCompetitors.map((competitor, i) => {
            const isFirst = i === 0
            const productCount = competitor.products?.length ?? 0
            const pendingCount = competitor.products?.filter((p: { status: string }) => p.status === 'pending').length ?? 0
            return (
              <div key={competitor.id} style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1.5fr 80px 1fr 60px', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)', gap: 12, background: isFirst ? 'rgba(167,139,250,0.04)' : 'transparent', borderLeft: isFirst ? '2px solid var(--purple)' : '2px solid transparent' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isFirst ? 'var(--purple)' : 'var(--amber)', boxShadow: isFirst ? '0 0 6px rgba(167,139,250,0.5)' : 'none' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{competitor.name}</div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{competitor.domain}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {competitor.profile?.company_name || competitor.profile?.email}
                </div>
                <div>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--amber)' }}>{pendingCount}</span>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}> / {productCount}</span>
                </div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {(() => {
                    const diff = Math.floor((Date.now() - new Date(competitor.created_at).getTime()) / 60000)
                    if (diff < 60) return `${diff}m ago`
                    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
                    return `${Math.floor(diff / 1440)}d ago`
                  })()}
                </div>
                <a href={`https://${competitor.domain}`} target="_blank" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none' }}>↗</a>
              </div>
            )
          })}

          {/* Live competitors */}
          {liveCompetitors.length > 0 && (
            <>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,229,160,0.02)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live — {liveCompetitors.length} configured</span>
              </div>
              {liveCompetitors.map(competitor => {
                const liveCount = competitor.products?.filter((p: { status: string }) => p.status === 'live').length ?? 0
                const lastScraped = competitor.products?.reduce((latest: string | null, p: { last_scraped_at: string | null }) => {
                  if (!p.last_scraped_at) return latest
                  if (!latest) return p.last_scraped_at
                  return p.last_scraped_at > latest ? p.last_scraped_at : latest
                }, null)

                return (
                  <div key={competitor.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)', gap: 14 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{competitor.name}</div>
                      <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {competitor.domain} · {liveCount} live product{liveCount !== 1 ? 's' : ''}
                        {lastScraped && ` · last scraped ${(() => {
                          const diff = Math.floor((Date.now() - new Date(lastScraped).getTime()) / 60000)
                          if (diff < 1) return 'just now'
                          if (diff < 60) return `${diff}m ago`
                          if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
                          return `${Math.floor(diff / 1440)}d ago`
                        })()}`}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {competitor.profile?.company_name || competitor.profile?.email}
                    </div>
                    <RefreshButton competitorId={competitor.id} productCount={liveCount} />
                    <a href={`https://${competitor.domain}`} target="_blank" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none', flexShrink: 0 }}>↗</a>
                  </div>
                )
              })}
            </>
          )}
        </div>

        <AdminConfigurePanel competitor={firstPending} sampleProduct={sampleProduct} />
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
