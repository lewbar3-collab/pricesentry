'use client'

import { useState } from 'react'

interface Props {
  competitorId: string
  productCount: number
}

export default function RefreshButton({ competitorId, productCount }: Props) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null)

  async function handleRefresh() {
    setStatus('running')
    setResult(null)
    try {
      const res = await fetch('/api/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: competitorId }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: data.success, errors: data.errors })
        setStatus('done')
        setTimeout(() => { setStatus('idle'); setResult(null) }, 4000)
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  if (status === 'running') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-dot 1s infinite' }} />
        Scraping {productCount}...
      </div>
    )
  }

  if (status === 'done' && result) {
    return (
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)' }}>
        ✓ {result.success} ok{result.errors > 0 ? ` · ${result.errors} err` : ''}
      </div>
    )
  }

  if (status === 'error') {
    return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--red)' }}>✗ Failed</div>
  }

  return (
    <button
      onClick={handleRefresh}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
        background: 'var(--surface2)', color: 'var(--text-dim)',
        border: '1px solid var(--border-bright)', cursor: 'pointer',
        fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      ↻ Refresh
    </button>
  )
}
