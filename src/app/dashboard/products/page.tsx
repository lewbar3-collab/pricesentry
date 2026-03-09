'use client'

import { useState, useEffect } from 'react'
import type { Product, Competitor } from '@/types'
import StatusPill from '@/components/ui/StatusPill'
import ChangePill from '@/components/ui/ChangePill'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [competitorId, setCompetitorId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/competitors').then(r => r.json()),
    ]).then(([prods, comps]) => {
      setProducts(prods)
      setCompetitors(comps)
      if (comps.length > 0) setCompetitorId(comps[0].id)
      setLoading(false)
    })
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, competitor_id: competitorId }),
    })
    const prod = await res.json()
    const comp = competitors.find(c => c.id === competitorId)
    setProducts(prev => [{ ...prod, competitor: comp }, ...prev])
    setName(''); setUrl(''); setShowForm(false); setSaving(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Products</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Add product URLs to track. Our team will configure each scraper.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#060810', border: 'none', cursor: 'pointer' }}
        >
          ＋ Add Product URL
        </button>
      </div>

      {showForm && (
        <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border-bright)', borderRadius: 13, padding: '24px', marginBottom: 20 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Track New Product</div>

          {competitors.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--amber)' }}>
              ⚠️ You need to <a href="/dashboard/competitors" style={{ color: 'var(--accent)' }}>add a competitor</a> first.
            </p>
          ) : (
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Competitor</label>
                  <select
                    value={competitorId}
                    onChange={e => setCompetitorId(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', appearance: 'none' }}
                  >
                    {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Product Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="Marble White Panel 2.4m" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Product URL</label>
                <input value={url} onChange={e => setUrl(e.target.value)} required placeholder="https://wetwall.co.uk/products/marble-white-2400mm" type="url" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 13, border: '1px solid var(--border-bright)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 7, background: 'var(--accent)', color: '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  {saving ? 'Submitting...' : 'Submit for Setup'}
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
                ✅ Once submitted, our team will configure the scraper and set it live. You'll be notified when it's tracking.
              </p>
            </form>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
          {['Product / URL', 'Competitor', 'Current Price', 'Change', 'Status'].map(h => (
            <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
        ) : products.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No products yet.</div>
        ) : (
          products.map(product => (
            <div key={product.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 100px', alignItems: 'center', padding: '13px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{product.name}</div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{product.url}</div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{(product.competitor as Competitor)?.name ?? '—'}</div>
              <div className="font-mono" style={{ fontSize: 13, fontWeight: 500 }}>{product.last_price ? `£${product.last_price.toFixed(2)}` : '—'}</div>
              <div><ChangePill oldPrice={null} newPrice={product.last_price} /></div>
              <div><StatusPill status={product.status} /></div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
