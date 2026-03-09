import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

export default async function AdminCronPage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  // Stats for last 24h
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: recentJobs } = await supabase
    .from('scrape_jobs')
    .select('status, duration_ms, created_at')
    .gte('created_at', yesterday)
    .order('created_at', { ascending: false })

  const total = recentJobs?.length ?? 0
  const success = recentJobs?.filter(j => j.status === 'success').length ?? 0
  const errors = recentJobs?.filter(j => j.status === 'error').length ?? 0
  const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : '0'

  // Group by hour for chart data
  const hourlyData: Record<string, { success: number; error: number }> = {}
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(Date.now() - i * 60 * 60 * 1000)
    const key = hour.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })
    hourlyData[key] = { success: 0, error: 0 }
  }
  recentJobs?.forEach(job => {
    const key = new Date(job.created_at).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (hourlyData[key]) {
      if (job.status === 'success') hourlyData[key].success++
      else hourlyData[key].error++
    }
  })

  // Next cron run (top of next hour)
  const now = new Date()
  const nextRun = new Date(now)
  nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0)
  const minsUntil = Math.floor((nextRun.getTime() - now.getTime()) / 1000 / 60)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Cron Jobs</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Hourly scrape scheduler — last 24 hours</p>
      </div>

      {/* Next run */}
      <div className="animate-fade-up delay-100" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 2s infinite' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Cron is active</div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Schedule: 0 * * * * (every hour)</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 22, color: 'var(--accent)' }}>{minsUntil}m</div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Until next run</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total (24h)', value: total, color: 'var(--text)' },
          { label: 'Success', value: success, color: 'var(--accent)' },
          { label: 'Errors', value: errors, color: 'var(--red)' },
          { label: 'Success Rate', value: `${successRate}%`, color: 'var(--blue)' },
        ].map(s => (
          <div key={s.label} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 22, color: s.color }}>{s.value}</div>
            <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Hourly breakdown */}
      <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '20px 24px', marginBottom: 20 }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Hourly Activity (last 24h)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 80 }}>
          {Object.entries(hourlyData).slice(-24).map(([hour, data]) => {
            const barTotal = data.success + data.error
            const maxVal = Math.max(...Object.values(hourlyData).map(d => d.success + d.error), 1)
            const height = barTotal > 0 ? Math.max((barTotal / maxVal) * 70, 4) : 2
            return (
              <div key={hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }} title={`${hour}: ${data.success} ok, ${data.error} err`}>
                {data.error > 0 && (
                  <div style={{ width: '100%', height: (data.error / maxVal) * 70, background: 'var(--red)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} />
                )}
                <div style={{ width: '100%', height: (data.success / maxVal) * 70 || height, background: data.success > 0 ? 'var(--accent)' : 'var(--border)', borderRadius: data.error > 0 ? '0' : '2px 2px 0 0', opacity: 0.8 }} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>24h ago</div>
          <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>Now</div>
        </div>
      </div>

      {/* Manual trigger instructions */}
      <div className="animate-fade-up delay-300" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '20px 24px' }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Manual Trigger</div>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>Run the cron manually from your terminal to trigger an immediate scrape sweep:</p>
        <div style={{ background: '#1E1E2E', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
          <div className="font-mono" style={{ fontSize: 12, color: '#00e5a0' }}>
            curl -H &quot;Authorization: Bearer YOUR_CRON_SECRET&quot; {process.env.NEXT_PUBLIC_APP_URL}/api/cron
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Replace YOUR_CRON_SECRET with the value from your Vercel environment variables.</p>
      </div>
    </div>
  )
}
