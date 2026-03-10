'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function JoinPage() {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const router = useRouter()

  useEffect(() => {
    async function activate() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('error'); return }

      // Find the pending invite for this email and activate it
      const res = await fetch('/api/team/join', { method: 'POST' })
      if (res.ok) {
        setStatus('done')
        setTimeout(() => router.push('/dashboard'), 1500)
      } else {
        setStatus('error')
      }
    }
    activate()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        {status === 'loading' && <div style={{ color: 'var(--text-dim)', fontSize: 14 }}>Activating your account...</div>}
        {status === 'done' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>You're in!</div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Redirecting to dashboard...</div>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 12 }}>❌</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Something went wrong</div>
            <a href="/login" style={{ color: 'var(--accent)', fontSize: 13 }}>Go to login</a>
          </>
        )}
      </div>
    </div>
  )
}
