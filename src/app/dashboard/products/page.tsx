'use client'

import { useState, useEffect, useRef } from 'react'
import type { Product, Competitor, CompetitorProduct } from '@/types'

const TAG_COLOURS = [
  { bg: 'rgba(0,229,160,0.12)',   text: 'var(--accent)',  border: 'rgba(0,229,160,0.25)' },
  { bg: 'rgba(167,139,250,0.12)', text: 'var(--purple)',  border: 'rgba(167,139,250,0.25)' },
  { bg: 'rgba(77,159,255,0.12)',  text: '#4d9fff',        border: 'rgba(77,159,255,0.25)' },
  { bg: 'rgba(255,184,63,0.12)',  text: 'var(--amber)',   border: 'rgba(255,184,63,0.25)' },
  { bg: 'rgba(255,77,106,0.12)',  text: 'var(--red)',     border: 'rgba(255,77,106,0.25)' },
]
function tagColour(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return TAG_COLOURS[Math.abs(h) % TAG_COLOURS.length]
}
function CategoryTag({ category }: { category: string }) {
  const c = tagColour(category)
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{category}</span>
}

interface AlertRule {
  id: string
  competitor_product_id: string
  trigger: 'any_change' | 'drops_by' | 'rises_above' | 'below_price' | 'above_price'
  threshold: number | null
  email: string
  is_active: boolean
}

type FullProduct = Product & {
  competitor_products?: (CompetitorProduct & { competitor?: Competitor })[]
}

const TRIGGER_LABELS: Record<string, string> = {
  any_change:  'Any change',
  drops_by:    'Drops by £',
  rises_above: 'Rises by £',
  below_price: 'Goes below £',
  above_price: 'Goes above £',
}
const NEEDS_THRESHOLD = ['drops_by', 'rises_above', 'below_price', 'above_price']

export default function ProductsPage() {
  const [products, setProducts]       = useState<FullProduct[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [alerts, setAlerts]           = useState<AlertRule[]>([])
  const [profileEmail, setProfileEmail] = useState('')
  const [loading, setLoading]         = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  // New product form
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newName, setNewName]         = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)

  // Add competitor URL form (per product)
  const [addingCompetitorFor, setAddingCompetitorFor] = useState<string | null>(null)
  const [cpCompetitorId, setCpCompetitorId] = useState('')
  const [cpUrl, setCpUrl]             = useState('')
  const [savingCp, setSavingCp]       = useState(false)


  // Alert form (per competitor_product)
  const [alertFormFor, setAlertFormFor] = useState<string | null>(null)
  const [alertTrigger, setAlertTrigger] = useState<string>('any_change')
  const [alertThreshold, setAlertThreshold] = useState('')
  const [alertEmail, setAlertEmail]   = useState('')
  const [savingAlert, setSavingAlert] = useState(false)

  // Inline edit
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editName, setEditName]           = useState('')
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadForId  = useRef<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/competitors').then(r => r.json()),
      fetch('/api/alerts').then(r => r.json()),
      fetch('/api/profile').then(r => r.json()).catch(() => ({ email: '' })),
    ]).then(([prods, comps, alts, prof]) => {
      setProducts(Array.isArray(prods) ? prods : [])
      setCompetitors(Array.isArray(comps) ? comps : [])
      setAlerts(Array.isArray(alts) ? alts : [])
      setProfileEmail(prof?.email ?? '')
      if (comps.length > 0) setCpCompetitorId(comps[0].id)

      setLoading(false)
    })
  }, [])

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])).sort()]
  const filtered   = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory)

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault(); setSavingProduct(true)
    const res  = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, category: newCategory || null }) })
    const prod = await res.json()
    setProducts(prev => [{ ...prod, competitor_products: [] }, ...prev])
    setNewName(''); setNewCategory(''); setShowAddProduct(false); setSavingProduct(false)
  }

  async function handleAddCompetitorProduct(e: React.FormEvent, productId: string) {
    e.preventDefault(); setSavingCp(true)
    const res = await fetch('/api/competitor-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: productId, competitor_id: cpCompetitorId, url: cpUrl }) })
    const cp  = await res.json()
    if (!res.ok) {
      alert(cp.error ?? 'Failed to add competitor URL')
      setSavingCp(false)
      return
    }
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, competitor_products: [...(p.competitor_products ?? []), cp] } : p))
    setCpUrl(''); setAddingCompetitorFor(null); setSavingCp(false)
  }

  async function handleRemoveCompetitorProduct(productId: string, cpId: string) {
    await fetch('/api/competitor-products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cpId }) })
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, competitor_products: p.competitor_products?.filter(cp => cp.id !== cpId) } : p))
    setAlerts(prev => prev.filter(a => a.competitor_product_id !== cpId))
  }

  async function handleSaveCategory(productId: string) {
    await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: productId, category: editCategory || null }) })
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, category: editCategory || null } : p))
    setEditingId(null)
  }

  async function handleSaveName(productId: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    await fetch('/api/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: productId, name: trimmed }) })
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, name: trimmed } : p))
    setEditingNameId(null)
  }

  async function handleDeleteProduct(productId: string) {
    await fetch('/api/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: productId }) })
    setProducts(prev => prev.filter(p => p.id !== productId))
    setDeletingId(null)
  }

  function openAlertForm(cpId: string) {
    setAlertFormFor(alertFormFor === cpId ? null : cpId)
    setAlertTrigger('any_change')
    setAlertThreshold('')
    setAlertEmail(profileEmail)
  }

  async function handleSaveAlert(e: React.FormEvent, cpId: string) {
    e.preventDefault(); setSavingAlert(true)
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competitor_product_id: cpId,
        trigger: alertTrigger,
        threshold: NEEDS_THRESHOLD.includes(alertTrigger) ? parseFloat(alertThreshold) : null,
        email: alertEmail,
      }),
    })
    const rule = await res.json()
    setAlerts(prev => [...prev, rule])
    setAlertFormFor(null); setSavingAlert(false)
  }

  async function handleDeleteAlert(alertId: string) {
    await fetch('/api/alerts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: alertId }) })
    setAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  async function handleToggleAlert(alert: AlertRule) {
    const res  = await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: alert.id, is_active: !alert.is_active }) })
    const updated = await res.json()
    setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a))
  }

  function triggerUpload(productId: string) {
    uploadForId.current = productId
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; const productId = uploadForId.current
    if (!file || !productId) return
    setUploadingId(productId)
    try {
      // Read as base64 and send as JSON to avoid Next.js multipart body-size issues
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const ext = file.name.split('.').pop() ?? 'jpg'
      const res  = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, data: base64, mime_type: file.type, ext }),
      })
      const data = await res.json()
      if (data.url) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_url: data.url } : p))
      } else {
        alert(`Image upload failed: ${data.error ?? 'Unknown error'}`)
      }
    } catch (err) {
      alert(`Image upload failed: ${err instanceof Error ? err.message : 'Network error'}`)
    }
    setUploadingId(null); e.target.value = ''
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Tracked Products</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Track competitor prices and set alerts per competitor</p>
        </div>
        <button onClick={() => setShowAddProduct(!showAddProduct)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#060810', border: 'none', cursor: 'pointer' }}>
          ＋ Add Product
        </button>
      </div>

      {/* Add product form */}
      {showAddProduct && (
        <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border-bright)', borderRadius: 13, padding: '24px', marginBottom: 20 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>New Product</div>
          <form onSubmit={handleAddProduct}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Product Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} required placeholder="e.g. Black Oak Acoustic Slat Panel" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Category <span style={{ opacity: 0.5 }}>(optional)</span></label>
                <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g. Acoustic Panels" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setShowAddProduct(false)} style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 13, border: '1px solid var(--border-bright)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={savingProduct} style={{ padding: '9px 20px', borderRadius: 7, background: 'var(--accent)', color: '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>{savingProduct ? 'Creating...' : 'Create Product'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Category filters */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat
            const c = cat !== 'All' ? tagColour(cat) : null
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Mono, monospace', border: '1px solid', background: isActive ? (c?.bg ?? 'var(--accent-dim)') : 'var(--surface)', color: isActive ? (c?.text ?? 'var(--accent)') : 'var(--text-muted)', borderColor: isActive ? (c?.border ?? 'rgba(0,229,160,0.25)') : 'var(--border)' }}>
                {cat}{cat !== 'All' && <span style={{ marginLeft: 5, opacity: 0.6 }}>{products.filter(p => p.category === cat).length}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Product cards */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {activeCategory !== 'All' ? `No products in "${activeCategory}"` : 'No products yet — add one above.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((product, pi) => (
            <div key={product.id} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', animationDelay: `${pi * 0.04}s` }}>

              {/* Product header */}
              <div style={{ display: 'flex' }}>
                <div onClick={() => triggerUpload(product.id)} style={{ width: 100, minHeight: 80, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                  {uploadingId === product.id ? <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>...</span>
                    : product.image_url ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                    : <span style={{ fontSize: 20 }}>📷</span>}
                </div>
                <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingNameId === product.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                        <input
                          autoFocus
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveName(product.id); if (e.key === 'Escape') setEditingNameId(null) }}
                          style={{ flex: 1, background: 'var(--bg)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 7, padding: '5px 10px', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--text)', outline: 'none' }}
                        />
                        <button onClick={() => handleSaveName(product.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'var(--accent)', color: '#060810', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => setEditingNameId(null)} style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{product.name}</div>
                        <button onClick={() => { setEditingNameId(product.id); setEditName(product.name) }} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', opacity: 0.6 }} title="Edit name">✏️</button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {editingId === product.id ? (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <input autoFocus value={editCategory} onChange={e => setEditCategory(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(product.id); if (e.key === 'Escape') setEditingId(null) }} placeholder="Category..." style={{ background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '3px 9px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text)', outline: 'none', width: 140 }} />
                          <button onClick={() => handleSaveCategory(product.id)} style={{ padding: '3px 9px', borderRadius: 6, background: 'var(--accent)', color: '#060810', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>✓</button>
                          <button onClick={() => setEditingId(null)} style={{ padding: '3px 7px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 11, border: '1px solid var(--border)', cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <>
                          {product.category ? <CategoryTag category={product.category} /> : <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>Uncategorised</span>}
                          <button onClick={() => { setEditingId(product.id); setEditCategory(product.category ?? '') }} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 5px' }}>✏️</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => { setAddingCompetitorFor(addingCompetitorFor === product.id ? null : product.id); if (competitors.length > 0) setCpCompetitorId(competitors[0].id); setCpUrl('') }} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border-bright)', cursor: 'pointer' }}>
                      ＋ Track Competitor Price
                    </button>
                    {deletingId === product.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'DM Mono, monospace' }}>Delete?</span>
                        <button onClick={() => handleDeleteProduct(product.id)} style={{ padding: '5px 10px', borderRadius: 6, background: 'rgba(255,77,106,0.15)', color: 'var(--red)', fontSize: 11, fontWeight: 600, border: '1px solid rgba(255,77,106,0.3)', cursor: 'pointer' }}>Yes</button>
                        <button onClick={() => setDeletingId(null)} style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 11, border: '1px solid var(--border)', cursor: 'pointer' }}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeletingId(product.id)} title="Delete product" style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>🗑</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Add competitor URL form */}
              {addingCompetitorFor === product.id && (
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'rgba(167,139,250,0.03)' }}>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--purple)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Assign competitor URL</div>
                  {competitors.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--amber)' }}>⚠️ <a href="/dashboard/competitors" style={{ color: 'var(--accent)' }}>Add a competitor</a> first.</p>
                  ) : (
                    <form onSubmit={e => handleAddCompetitorProduct(e, product.id)}>
                      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr auto', gap: 10, alignItems: 'flex-end' }}>
                        <div>
                          <label className="font-mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Competitor</label>
                          <select value={cpCompetitorId} onChange={e => setCpCompetitorId(e.target.value)} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', appearance: 'none' }}>
                            {competitors.map(c => <option key={c.id} value={c.id}>{c.is_own_company ? '🏠 ' : ''}{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Product URL on their site</label>
                          <input value={cpUrl} onChange={e => setCpUrl(e.target.value)} required type="url" placeholder="https://competitor.co.uk/products/example" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => setAddingCompetitorFor(null)} style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>Cancel</button>
                          <button type="submit" disabled={savingCp} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--purple-dim)', color: 'var(--purple)', fontWeight: 600, fontSize: 12, border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer' }}>{savingCp ? 'Adding...' : 'Submit'}</button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Competitor rows */}
              {(product.competitor_products?.length ?? 0) > 0 && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {[...(product.competitor_products ?? [])].sort((a, b) => {
                      if (!a.last_price && !b.last_price) return 0
                      if (!a.last_price) return 1
                      if (!b.last_price) return -1
                      return Number(a.last_price) - Number(b.last_price)
                    }).map((cp, i) => {
                    const cpAlerts = alerts.filter(a => a.competitor_product_id === cp.id)
                    const isLastRow = i === (product.competitor_products?.length ?? 0) - 1
                    const alertOpen = alertFormFor === cp.id

                    return (
                      <div key={cp.id}>
                        {/* Competitor row */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '11px 18px', borderBottom: (!isLastRow || alertOpen || cpAlerts.length > 0) ? '1px solid var(--border)' : 'none', gap: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: cp.competitor?.is_own_company ? 'var(--accent-dim)' : 'linear-gradient(135deg,#4d9fff,#a78bfa)', border: cp.competitor?.is_own_company ? '1px solid rgba(0,229,160,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: cp.competitor?.is_own_company ? 14 : 11, fontWeight: 700, flexShrink: 0, color: cp.competitor?.is_own_company ? 'var(--accent)' : '#fff' }}>
                            {cp.competitor?.is_own_company ? '🏠' : cp.competitor?.name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12.5, fontWeight: 500, color: cp.competitor?.is_own_company ? 'var(--accent)' : 'inherit' }}>{cp.competitor?.name}</span>
                              {cp.competitor?.is_own_company && <span className="font-mono" style={{ fontSize: 8, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.3)', padding: '1px 5px', borderRadius: 8, letterSpacing: '0.04em' }}>YOU</span>}
                            </div>
                            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.url}</div>
                          </div>
                          <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: cp.last_price ? 'var(--text)' : 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>
                            {cp.last_price ? `£${Number(cp.last_price).toFixed(2)}` : '—'}
                          </div>

                          {/* Delivery badge */}
                          {cp.competitor?.delivery_cost !== null && cp.competitor?.delivery_cost !== undefined && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                              <span className="font-mono" style={{ fontSize: 10, color: 'var(--purple)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>
                                🚚 £{Number(cp.competitor.delivery_cost).toFixed(2)}
                              </span>
                              {cp.competitor.free_delivery_threshold !== null && cp.competitor.free_delivery_threshold !== undefined && (
                                <span className="font-mono" style={{ fontSize: 9, color: 'var(--accent)', marginTop: 2 }}>
                                  free &gt;£{Number(cp.competitor.free_delivery_threshold).toFixed(0)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Status pill */}
                          <span className="font-mono" style={{ fontSize: 10, color: cp.status === 'live' ? 'var(--accent)' : cp.status === 'error' ? 'var(--red)' : 'var(--amber)', background: cp.status === 'live' ? 'var(--accent-dim)' : cp.status === 'error' ? 'rgba(255,77,106,0.1)' : 'var(--amber-dim)', border: `1px solid ${cp.status === 'live' ? 'rgba(0,229,160,0.2)' : cp.status === 'error' ? 'rgba(255,77,106,0.2)' : 'rgba(255,184,63,0.2)'}`, padding: '3px 8px', borderRadius: 5, flexShrink: 0 }}>
                            {cp.status}
                          </span>

                          {/* Alert bell */}
                          <button
                            onClick={() => openAlertForm(cp.id)}
                            title={cpAlerts.length ? `${cpAlerts.length} alert${cpAlerts.length > 1 ? 's' : ''} active` : 'Set alert'}
                            style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, background: cpAlerts.some(a => a.is_active) ? 'var(--accent-dim)' : 'var(--surface2)', border: `1px solid ${cpAlerts.some(a => a.is_active) ? 'rgba(0,229,160,0.25)' : 'var(--border)'}`, cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                          >
                            🔔
                            {cpAlerts.length > 0 && (
                              <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', color: '#060810', fontSize: 8, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace' }}>{cpAlerts.length}</span>
                            )}
                          </button>

                          {/* Remove */}
                          <button onClick={() => handleRemoveCompetitorProduct(product.id, cp.id)} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                        </div>

                        {/* Existing alerts */}
                        {cpAlerts.length > 0 && (
                          <div style={{ padding: '10px 18px 10px 58px', borderBottom: alertOpen ? '1px solid var(--border)' : (!isLastRow ? '1px solid var(--border)' : 'none'), display: 'flex', flexWrap: 'wrap', gap: 6, background: 'rgba(0,0,0,0.1)' }}>
                            {cpAlerts.map(rule => (
                              <div key={rule.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: rule.is_active ? 'var(--accent-dim)' : 'var(--surface2)', border: `1px solid ${rule.is_active ? 'rgba(0,229,160,0.2)' : 'var(--border)'}` }}>
                                <span style={{ fontSize: 11, color: rule.is_active ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                                  {TRIGGER_LABELS[rule.trigger]}{rule.threshold !== null ? rule.threshold.toFixed(2) : ''}
                                </span>
                                <button onClick={() => handleToggleAlert(rule)} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'none', border: '1px solid currentColor', color: rule.is_active ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}>
                                  {rule.is_active ? 'on' : 'off'}
                                </button>
                                <button onClick={() => handleDeleteAlert(rule.id)} style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add alert form */}
                        {alertOpen && (
                          <div style={{ padding: '14px 18px 14px 58px', background: 'rgba(0,229,160,0.02)', borderBottom: !isLastRow ? '1px solid var(--border)' : 'none' }}>
                            <div className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>New alert for {cp.competitor?.name}</div>
                            <form onSubmit={e => handleSaveAlert(e, cp.id)}>
                              <div style={{ display: 'grid', gridTemplateColumns: '160px 120px 1fr auto', gap: 10, alignItems: 'flex-end' }}>
                                <div>
                                  <label className="font-mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Trigger</label>
                                  <select value={alertTrigger} onChange={e => setAlertTrigger(e.target.value)} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', appearance: 'none' }}>
                                    {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                  </select>
                                </div>
                                {NEEDS_THRESHOLD.includes(alertTrigger) && (
                                  <div>
                                    <label className="font-mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Amount (£)</label>
                                    <input value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} required type="number" step="0.01" min="0" placeholder="0.00" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
                                  </div>
                                )}
                                <div>
                                  <label className="font-mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Email</label>
                                  <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} required type="email" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button type="button" onClick={() => setAlertFormFor(null)} style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>Cancel</button>
                                  <button type="submit" disabled={savingAlert} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 600, fontSize: 12, border: '1px solid rgba(0,229,160,0.25)', cursor: 'pointer' }}>{savingAlert ? 'Saving...' : '+ Save Alert'}</button>
                                </div>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {(product.competitor_products?.length ?? 0) === 0 && addingCompetitorFor !== product.id && (
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                  No prices tracked yet — click "Track Competitor Price" to start
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
