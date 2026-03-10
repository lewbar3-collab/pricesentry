'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)
  const [validSession, setValidSession] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Supabase puts the token in the URL hash — just check we have a session
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setValidSession(true)
    })
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/'), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)',
    borderRadius: 8, padding: '10px 14px', fontFamily: 'DM Mono, monospace',
    fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', width: 500, height: 500, borderRadius: '50%', background: '#00e5ff', top: -150, right: -150, filter: 'blur(140px)', opacity: 0.05, pointerEvents: 'none' }} />

      <div className="animate-fade-up" style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo.svg" alt="PricingSentry" style={{ width: 260, height: 'auto', display: 'inline-block' }} />
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(0,229,160,0.04),transparent)' }}>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.5px', marginBottom: 3 }}>Set new password</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Choose a strong password for your account</div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Password updated</div>
                <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>Redirecting you to the dashboard...</div>
              </div>
            ) : !validSession ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Invalid or expired reset link. <a href="/login" style={{ color: 'var(--accent)' }}>Request a new one</a>
              </div>
            ) : (
              <form onSubmit={handleReset}>
                <div style={{ marginBottom: 14 }}>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>New Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters" style={inputStyle} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Confirm Password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" style={inputStyle} />
                </div>
                {error && (
                  <div style={{ background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12.5, color: 'var(--red)', marginBottom: 14 }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? 'rgba(0,229,160,0.6)' : 'var(--accent)', color: '#060810', fontWeight: 700, fontSize: 14, padding: '11px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s' }}>
                  {loading ? 'Updating...' : 'Update Password →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
