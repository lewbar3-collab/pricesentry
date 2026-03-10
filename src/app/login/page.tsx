'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Mode = 'login' | 'reset'

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/'); router.refresh()
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setResetSent(true); setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)',
    borderRadius: 8, padding: '10px 14px', fontFamily: 'DM Mono, monospace',
    fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>

      {/* Ambient glows */}
      <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: '#00e5ff', top: -150, right: -150, filter: 'blur(140px)', opacity: 0.05, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: '#0080ff', bottom: -150, left: -150, filter: 'blur(140px)', opacity: 0.05, pointerEvents: 'none' }} />

      <div className="animate-fade-up" style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Image src="/logo.svg" alt="PriceSentry" width={240} height={80} style={{ display: 'inline-block' }} priority />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>

          {/* Card header */}
          <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(0,229,160,0.04),transparent)' }}>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px', marginBottom: 3 }}>
              {mode === 'login' ? 'Welcome back' : 'Reset password'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {mode === 'login' ? 'Sign in to your account' : 'Enter your email and we\'ll send a reset link'}
            </div>
          </div>

          {/* Form */}
          <div style={{ padding: '24px 28px' }}>

            {/* Reset sent confirmation */}
            {resetSent ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Check your inbox</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 20 }}>
                  We sent a password reset link to <span style={{ color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{email}</span>
                </div>
                <button onClick={() => { setMode('login'); setResetSent(false) }} style={{ fontSize: 13, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={mode === 'login' ? handleLogin : handleReset}>
                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@company.com" style={inputStyle} />
                </div>

                {/* Password (login only) */}
                {mode === 'login' && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <label className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Password</label>
                      <button type="button" onClick={() => { setMode('reset'); setError(null) }} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'DM Mono, monospace' }}>
                        Forgot password?
                      </button>
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
                  </div>
                )}

                {/* Remember me (login only) */}
                {mode === 'login' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                    <div
                      onClick={() => setRememberMe(!rememberMe)}
                      style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${rememberMe ? 'var(--accent)' : 'var(--border-bright)'}`, background: rememberMe ? 'var(--accent)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                    >
                      {rememberMe && <span style={{ color: '#060810', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none' }} onClick={() => setRememberMe(!rememberMe)}>
                      Remember me
                    </span>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--red)', marginBottom: 14 }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? 'rgba(0,229,160,0.6)' : 'var(--accent)', color: '#060810', fontWeight: 700, fontSize: 14, padding: '11px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s', letterSpacing: '-0.2px' }}>
                  {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Send Reset Link →'}
                </button>

                {mode === 'reset' && (
                  <div style={{ textAlign: 'center', marginTop: 14 }}>
                    <button type="button" onClick={() => { setMode('login'); setError(null) }} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'DM Mono, monospace' }}>
                      Back to sign in
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>COMPETITOR PRICE INTELLIGENCE</span>
        </div>
      </div>
    </div>
  )
}
