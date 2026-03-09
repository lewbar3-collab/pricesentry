'use client'

import { useState } from 'react'

interface Props {
  competitorId: string
  label: string
}

export default function ClientRefreshButton({ competitorId, label }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')

  async function handleRefresh() {
    setStatus('running')
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: competitorId }),
      })
      if (res.ok) {
        setStatus('done')
        setTimeout(() => { setStatus('idle'); window.location.reload() }, 1500)
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
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
      disabled={status === 'running' || status === 'done'}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: bg, color, border, cursor: status === 'running' ? 'wait' : 'pointer', transition: 'all 0.2s', fontFamily: 'DM Mono, monospace' }}
    >
      {status === 'running' && <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 11 }}>↻</span>}
      {status === 'done' && '✓'}
      {status === 'error' && '✗'}
      {status === 'idle' && '↻'}
      {' '}
      {status === 'running' ? 'Refreshing...' : status === 'done' ? 'Updated!' : status === 'error' ? 'Failed' : `Refresh ${label}`}
    </button>
  )
}
