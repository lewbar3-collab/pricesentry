'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: 'var(--accent)', top: -100, right: -100, filter: 'blur(120px)', opacity: 0.08, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', width: 400, height: 400, borderRadius: '50%', background: 'var(--blue)', bottom: -100, left: -100, filter: 'blur(120px)', opacity: 0.08, pointerEvents: 'none' }} />

      <div
        className="animate-fade-up"
        style={{ width: '100%', maxWidth: 400, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '32px 32px 24px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(0,229,160,0.05), transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>👁</div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px' }}>PriceSentry</div>
          </div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.5px', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Sign in to your account</div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ padding: '28px 32px' }}>
          <div style={{ marginBottom: 16 }}>
            <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none' }}
            />
          </div>

          {error && (
            <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--red)', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: loading ? 'rgba(0,229,160,0.6)' : 'var(--accent)', color: '#060810', fontWeight: 700, fontSize: 14, padding: '11px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}
