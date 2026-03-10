'use client'

import { useState, useEffect } from 'react'
import { getPlanLimits } from '@/lib/plans'

interface TeamMember {
  id: string
  invite_email: string
  status: 'pending' | 'active' | 'removed'
  invited_at: string
  joined_at: string | null
}

interface PlanInfo {
  plan: string
  email: string
}

export default function TeamPage() {
  const [members, setMembers]     = useState<TeamMember[]>([])
  const [planInfo, setPlanInfo]   = useState<PlanInfo | null>(null)
  const [loading, setLoading]     = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/team').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([team, prof]) => {
      setMembers(Array.isArray(team) ? team : [])
      setPlanInfo(prof)
      setLoading(false)
    })
  }, [])

  const limits = planInfo ? getPlanLimits(planInfo.plan) : getPlanLimits('starter')
  const activeCount = members.filter(m => m.status === 'active').length
  const totalSeats = activeCount + 1 // +1 for owner
  const seatsLeft = limits.seats === 999 ? null : limits.seats - totalSeats

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(null)
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setMembers(prev => [...prev, data])
    setInviteEmail('')
    setSuccess(`Invite sent to ${data.invite_email}`)
    setSaving(false)
    setTimeout(() => setSuccess(null), 4000)
  }

  async function handleRemove(id: string, email: string) {
    if (!confirm(`Remove ${email} from your team?`)) return
    await fetch('/api/team', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const planColour = limits.colour
  const planBg = limits.colourDim
  const planBorder = limits.colourBorder

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Team</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Invite teammates to access your account's products and competitors
        </p>
      </div>

      {/* Plan + seats overview */}
      <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '20px 22px' }}>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Current Plan</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{limits.label}</span>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: planBg, color: planColour, border: `1px solid ${planBorder}`, fontFamily: 'DM Mono, monospace' }}>
              {planInfo?.plan ?? 'starter'}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {limits.competitors === null ? 'Unlimited competitors' : `Up to ${limits.competitors} competitor${limits.competitors !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '20px 22px' }}>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Team Seats</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{totalSeats}</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/ {limits.seats === 999 ? '∞' : limits.seats} used</span>
          </div>
          <div className="font-mono" style={{ fontSize: 11, color: seatsLeft === 0 ? 'var(--amber)' : 'var(--text-muted)', marginTop: 8 }}>
            {seatsLeft === null ? 'Unlimited seats' : seatsLeft === 0 ? 'No seats remaining — upgrade to add more' : `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} remaining`}
          </div>
        </div>
      </div>

      {/* Invite form */}
      <div className="animate-fade-up delay-100" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '22px 24px', marginBottom: 20 }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Invite a teammate</div>
        <form onSubmit={handleInvite}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email address</label>
              <input
                type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                disabled={seatsLeft === 0}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', opacity: seatsLeft === 0 ? 0.5 : 1 }}
              />
            </div>
            <button
              type="submit" disabled={saving || seatsLeft === 0}
              style={{ padding: '10px 20px', borderRadius: 8, background: seatsLeft === 0 ? 'var(--surface2)' : 'var(--accent)', color: seatsLeft === 0 ? 'var(--text-muted)' : '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: seatsLeft === 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
            >
              {saving ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
        {error && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', fontSize: 12.5, color: 'var(--red)' }}>{error}</div>}
        {success && <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.2)', fontSize: 12.5, color: 'var(--accent)' }}>✓ {success}</div>}
      </div>

      {/* Team list */}
      <div className="animate-fade-up delay-150" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>Members</div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{members.length + 1} total</div>
        </div>

        {/* Owner row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
            {planInfo?.email?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{planInfo?.email}</div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Account owner</div>
          </div>
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.2)', fontFamily: 'DM Mono, monospace' }}>owner</span>
        </div>

        {loading ? (
          <div style={{ padding: '32px 22px', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: '32px 22px', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'DM Mono, monospace' }}>No teammates yet — invite someone above</div>
        ) : (
          members.map(member => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: member.status === 'active' ? 'rgba(167,139,250,0.12)' : 'var(--surface2)', border: `1px solid ${member.status === 'active' ? 'rgba(167,139,250,0.25)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: member.status === 'active' ? 'var(--purple)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                {member.invite_email.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{member.invite_email}</div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {member.status === 'active'
                    ? `Joined ${new Date(member.joined_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : `Invited ${new Date(member.invited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, fontFamily: 'DM Mono, monospace', background: member.status === 'active' ? 'rgba(167,139,250,0.12)' : 'var(--amber-dim)', color: member.status === 'active' ? 'var(--purple)' : 'var(--amber)', border: `1px solid ${member.status === 'active' ? 'rgba(167,139,250,0.2)' : 'rgba(255,184,63,0.2)'}` }}>
                {member.status}
              </span>
              <button onClick={() => handleRemove(member.id, member.invite_email)} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
