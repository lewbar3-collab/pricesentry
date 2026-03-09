'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = e.currentTarget
    const companyName = (form.elements.namedItem('company_name') as HTMLInputElement).value

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ company_name: companyName }).eq('id', user.id)
    }
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handlePasswordReset() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      await supabase.auth.resetPasswordForEmail(user.email)
      alert('Password reset email sent!')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Settings</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Manage your account</p>
      </div>

      {/* Profile */}
      <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Profile</div>
        </div>
        <form onSubmit={handleSave} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Company Name
            </label>
            <input
              name="company_name"
              type="text"
              placeholder="Your company name"
              style={{ width: '100%', maxWidth: 400, background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              style={{ background: saved ? 'var(--accent)' : 'var(--surface2)', color: saved ? '#060810' : 'var(--text)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {saved ? '✓ Saved!' : loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security */}
      <div className="animate-fade-up delay-300" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Security</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>Change your password by requesting a reset email.</p>
          <button
            onClick={handlePasswordReset}
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Send Password Reset Email
          </button>
        </div>
      </div>

      {/* Notifications info */}
      <div className="animate-fade-up delay-400" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Notifications</div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>Email alerts on price changes</div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sent to your account email address</div>
            </div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.2)', padding: '3px 10px', borderRadius: 6 }}>
              Active
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
