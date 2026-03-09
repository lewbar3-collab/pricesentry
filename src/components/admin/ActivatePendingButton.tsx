'use client'

import { useState } from 'react'

interface Props {
  competitorId: string
  count: number
}

export default function ActivatePendingButton({ competitorId, count }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleActivate() {
    setStatus('loading')
    try {
      const res = await fetch('/api/competitor-products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: competitorId }),
      })
      if (res.ok) {
        setStatus('done')
        setTimeout(() => window.location.reload(), 800)
      } else {
        setStatus('error')
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <button
      onClick={handleActivate}
      disabled={status !== 'idle'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 12px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
        background: status === 'done' ? 'var(--accent-dim)' : 'var(--amber-dim)',
        color: status === 'done' ? 'var(--accent)' : 'var(--amber)',
        border: `1px solid ${status === 'done' ? 'rgba(0,229,160,0.2)' : 'rgba(255,184,63,0.2)'}`,
        cursor: 'pointer', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
        transition: 'all 0.15s',
      }}
    >
      {status === 'loading' ? '...' : status === 'done' ? '✓ Activated' : `⚡ Activate ${count} pending`}
    </button>
  )
}
