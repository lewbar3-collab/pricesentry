'use client'

import { useState, useEffect } from 'react'
import { PLAN_LIMITS } from '@/lib/plans'
import type { Plan } from '@/lib/plans'

interface Client {
  id: string
  email: string
  company_name: string | null
  plan: string
  created_at: string
}

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/clients').then(r => r.json()).then(data => {
      setClients(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  async function handlePlanChange(clientId: string, plan: string) {
    setSaving(clientId)
    const res = await fetch('/api/admin/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clientId, plan }),
    })
    const updated = await res.json()
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, plan: updated.plan } : c))
    setSaving(null)
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Clients</h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>{clients.length} registered client{clients.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 180px 120px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Client', 'Company', 'Plan', 'Joined'].map(h => (
            <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>No clients yet</div>
        ) : clients.map(client => {
          const planConfig = PLAN_LIMITS[(client.plan as Plan)] ?? PLAN_LIMITS.starter
          return (
            <div key={client.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 180px 120px', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{client.email}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{client.company_name ?? '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={client.plan}
                  onChange={e => handlePlanChange(client.id, e.target.value)}
                  disabled={saving === client.id}
                  style={{ background: 'var(--bg)', border: `1px solid ${planConfig.colourBorder}`, borderRadius: 7, padding: '5px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: planConfig.colour, outline: 'none', cursor: 'pointer', appearance: 'none' }}
                >
                  {Object.entries(PLAN_LIMITS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                {saving === client.id && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>saving...</span>}
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
