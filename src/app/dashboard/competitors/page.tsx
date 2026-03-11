'use client'

import { useState, useEffect } from 'react'
import { getPlanLimits } from '@/lib/plans'
import type { Competitor } from '@/types'

const inp = (value: string, onChange: (v: string) => void, placeholder: string, prefix?: string) => (
  <div style={{ position: 'relative' }}>
    {prefix && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace', pointerEvents: 'none' }}>{prefix}</span>}
    <input
      type="number" step="0.01" min="0"
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: `8px 11px 8px ${prefix ? '22px' : '11px'}`, fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }}
    />
  </div>
)

const fieldStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 6, fontFamily: 'DM Mono, monospace' }

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [plan, setPlan]               = useState<string>('starter')
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [limitReached, setLimitReached] = useState(false)

  // Add form state
  const [name, setName]               = useState('')
  const [domain, setDomain]           = useState('')
  const [isOwn, setIsOwn]             = useState(false)
  const [delivery, setDelivery]       = useState('')
  const [threshold, setThreshold]     = useState('')
  const [saving, setSaving]           = useState(false)

  // Edit form state
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [editName, setEditName]           = useState('')
  const [editDomain, setEditDomain]       = useState('')
  const [editIsOwn, setEditIsOwn]         = useState(false)
  const [editDelivery, setEditDelivery]   = useState('')
  const [editThreshold, setEditThreshold] = useState('')
  const [editSaving, setEditSaving]       = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/competitors').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()),
    ]).then(([comps, prof]) => {
      setCompetitors(Array.isArray(comps) ? comps : [])
      setPlan(prof.plan ?? 'starter')
      setLoading(false)
    })
  }, [])

  const limits  = getPlanLimits(plan)
  const atLimit = limits.competitors !== null && competitors.length >= limits.competitors

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    const res = await fetch('/api/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, domain,
        is_own_company: isOwn,
        delivery_cost: delivery ? parseFloat(delivery) : null,
        free_delivery_threshold: threshold ? parseFloat(threshold) : null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      if (data.limitReached) setLimitReached(true)
      setSaving(false)
      return
    }
    setCompetitors(prev => [data, ...prev])
    setName(''); setDomain(''); setIsOwn(false); setDelivery(''); setThreshold('')
    setShowForm(false); setSaving(false)
  }

  function openEdit(comp: Competitor) {
    setEditingId(comp.id)
    setEditName(comp.name)
    setEditDomain(comp.domain)
    setEditIsOwn(comp.is_own_company ?? false)
    setEditDelivery(comp.delivery_cost?.toString() ?? '')
    setEditThreshold(comp.free_delivery_threshold?.toString() ?? '')
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    setEditSaving(true)
    const res = await fetch('/api/competitors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        name: editName,
        domain: editDomain,
        is_own_company: editIsOwn,
        delivery_cost: editDelivery ? parseFloat(editDelivery) : null,
        free_delivery_threshold: editThreshold ? parseFloat(editThreshold) : null,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setCompetitors(prev => prev.map(c => c.id === editingId ? data : c))
      setEditingId(null)
    }
    setEditSaving(false)
  }

  const CheckboxRow = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, background: checked ? 'rgba(0,229,160,0.06)' : 'var(--bg)', border: `1px solid ${checked ? 'rgba(0,229,160,0.3)' : 'var(--border-bright)'}`, transition: 'all 0.15s', userSelect: 'none' }}>
      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? 'var(--accent)' : 'var(--border-bright)'}`, background: checked ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
        {checked && <span style={{ color: '#060810', fontSize: 11, fontWeight: 900, lineHeight: 1 }}>✓</span>}
      </div>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: checked ? 'var(--accent)' : 'var(--text)' }}>{label}</div>
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Highlighted in simulator & price comparisons</div>
      </div>
    </label>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Competitors</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Add competitor sites, then add products to track under each one.
            {limits.competitors !== null && (
              <span className="font-mono" style={{ marginLeft: 10, fontSize: 11, color: atLimit ? 'var(--amber)' : 'var(--text-muted)' }}>
                {competitors.length} / {limits.competitors} used
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => { if (!atLimit) { setShowForm(!showForm); setError(null) } }}
          disabled={atLimit}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: atLimit ? 'var(--surface2)' : 'var(--accent)', color: atLimit ? 'var(--text-muted)' : '#060810', border: atLimit ? '1px solid var(--border)' : 'none', cursor: atLimit ? 'not-allowed' : 'pointer', opacity: loading ? 0 : 1, transition: 'opacity 0.15s ease' }}
        >
          ＋ Add Competitor
        </button>
      </div>

      {atLimit && !loading && (
        <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 10, background: 'rgba(255,184,63,0.07)', border: '1px solid rgba(255,184,63,0.25)', marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 2 }}>Competitor limit reached</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Your <span className="font-mono" style={{ color: 'var(--text)' }}>{limits.label}</span> plan includes {limits.competitors} competitor{limits.competitors !== 1 ? 's' : ''}. Contact us to upgrade.</div>
          </div>
        </div>
      )}

      {error && !atLimit && (
        <div className="animate-fade-up" style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,77,106,0.07)', border: '1px solid rgba(255,77,106,0.2)', fontSize: 12.5, color: 'var(--red)', marginBottom: 16 }}>{error}</div>
      )}

      {/* ── Add form ── */}
      {showForm && !atLimit && (
        <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border-bright)', borderRadius: 13, padding: '24px', marginBottom: 20 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 18 }}>New Competitor</div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Company Name</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Wetwall" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Domain</label>
                <input value={domain} onChange={e => setDomain(e.target.value)} required placeholder="wetwall.co.uk" style={fieldStyle} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <CheckboxRow checked={isOwn} onChange={setIsOwn} label="This is my company" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>🚚 Delivery Cost <span style={{ opacity: 0.5 }}>(optional)</span></label>
                {inp(delivery, setDelivery, '0.00', '£')}
              </div>
              <div>
                <label style={labelStyle}>Free Delivery Over <span style={{ opacity: 0.5 }}>(optional)</span></label>
                {inp(threshold, setThreshold, 'e.g. 50.00', '£')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 13, border: '1px solid var(--border-bright)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '9px 24px', borderRadius: 7, background: 'var(--accent)', color: '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                {saving ? 'Adding...' : 'Add Competitor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : competitors.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No competitors yet. Add your first one above.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {competitors.map(comp => {
            const isOwnComp = comp.is_own_company
            return (
              <div key={comp.id} style={{ background: 'var(--surface)', border: `1px solid ${editingId === comp.id ? 'rgba(0,229,160,0.3)' : isOwnComp ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, borderRadius: 13, overflow: 'hidden', transition: 'border-color 0.15s' }}>

                {/* Main row */}
                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: isOwnComp ? 'var(--accent-dim)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {isOwnComp ? '🏠' : '🏢'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{comp.name}</div>
                      {isOwnComp && (
                        <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.3)', padding: '1px 7px', borderRadius: 10, letterSpacing: '0.05em' }}>MY COMPANY</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{comp.domain}</div>
                      {comp.delivery_cost !== null && comp.delivery_cost !== undefined ? (
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '1px 7px', borderRadius: 5 }}>
                          🚚 £{Number(comp.delivery_cost).toFixed(2)} delivery{comp.free_delivery_threshold !== null && comp.free_delivery_threshold !== undefined ? ` · free over £${Number(comp.free_delivery_threshold).toFixed(2)}` : ''}
                        </span>
                      ) : (
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.4 }}>no delivery info</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Scraper</div>
                    <div style={{ fontSize: 12, color: (comp.sale_price_selector || comp.price_selector) ? 'var(--accent)' : 'var(--amber)' }}>
                      {(comp.sale_price_selector || comp.price_selector) ? '✓ Configured' : '⏳ Pending setup'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => editingId === comp.id ? setEditingId(null) : openEdit(comp)}
                      style={{ padding: '7px 13px', borderRadius: 7, background: editingId === comp.id ? 'var(--accent-dim)' : 'var(--surface2)', color: editingId === comp.id ? 'var(--accent)' : 'var(--text-dim)', fontSize: 12, border: `1px solid ${editingId === comp.id ? 'rgba(0,229,160,0.25)' : 'var(--border-bright)'}`, cursor: 'pointer' }}
                    >
                      {editingId === comp.id ? '✕ Cancel' : '✏️ Edit'}
                    </button>
                    <a href={`/dashboard/products?competitor=${comp.id}`} style={{ padding: '7px 13px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 12, border: '1px solid var(--border-bright)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      Products →
                    </a>
                  </div>
                </div>

                {/* Edit form */}
                {editingId === comp.id && (
                  <div style={{ borderTop: '1px solid rgba(0,229,160,0.15)', padding: '18px 22px', background: 'rgba(0,229,160,0.02)' }}>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>Edit Competitor</div>
                    <form onSubmit={handleSaveEdit}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9.5 }}>Company Name</label>
                          <input value={editName} onChange={e => setEditName(e.target.value)} required style={{ ...fieldStyle, padding: '8px 11px' }} />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9.5 }}>Domain</label>
                          <input value={editDomain} onChange={e => setEditDomain(e.target.value)} required style={{ ...fieldStyle, padding: '8px 11px' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <CheckboxRow checked={editIsOwn} onChange={setEditIsOwn} label="This is my company" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9.5 }}>🚚 Delivery Cost</label>
                          {inp(editDelivery, setEditDelivery, 'e.g. 4.99', '£')}
                        </div>
                        <div>
                          <label style={{ ...labelStyle, fontSize: 9.5 }}>Free Delivery Over</label>
                          {inp(editThreshold, setEditThreshold, 'e.g. 50.00', '£')}
                        </div>
                        <button type="submit" disabled={editSaving} style={{ padding: '8px 20px', borderRadius: 7, background: 'var(--accent)', color: '#060810', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {editSaving ? 'Saving...' : '✓ Save'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
