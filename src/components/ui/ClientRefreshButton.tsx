'use client'

import { useState } from 'react'

// No competitor_id = refresh all
interface Props {
  competitorIds: string[]
}

export default function ClientRefreshButton({ competitorIds }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')

  async function handleRefresh() {
    setStatus('running')
    try {
      // Fire all competitor scrapes in parallel
      const results = await Promise.all(
        competitorIds.map(id =>
          fetch('/api/cron', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ competitor_id: id }),
          })
        )
      )
      const allOk = results.every(r => r.ok)
      setStatus(allOk ? 'done' : 'error')
      setTimeout(() => { setStatus('idle'); window.location.reload() }, 1500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const bg = status === 'done' ? 'var(--accent-dim)' : status === 'error' ? 'rgba(255,77,106,0.1)' : 'var(--surface2)'
  const color = status === 'done' ? 'var(--accent)' : status === 'error' ? 'var(--red)' : 'var(--text-dim)'
  const border = status === 'done' ? '1px solid rgba(0,229,160,0.2)' : status === 'error' ? '1px solid rgba(255,77,106,0.2)' : '1px solid var(--border-bright)'

  return (
    <button
      onClick={handleRefresh}
      disabled={status !== 'idle'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: bg, color, border, cursor: status === 'running' ? 'wait' : 'pointer', transition: 'all 0.2s', fontFamily: 'DM Mono, monospace' }}
    >
      {status === 'running' ? '↻ Refreshing...' : status === 'done' ? '✓ Updated!' : status === 'error' ? '✗ Failed' : '↻ Refresh All'}
    </button>
  )
}
