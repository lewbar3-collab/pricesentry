'use client'

import { useState, useEffect, useRef } from 'react'
import type { Product, Competitor, CompetitorProduct } from '@/types'
import StatusPill from '@/components/ui/StatusPill'

const TAG_COLOURS = [
  { bg: 'rgba(0,229,160,0.12)', text: 'var(--accent)', border: 'rgba(0,229,160,0.25)' },
  { bg: 'rgba(167,139,250,0.12)', text: 'var(--purple)', border: 'rgba(167,139,250,0.25)' },
  { bg: 'rgba(77,159,255,0.12)', text: '#4d9fff', border: 'rgba(77,159,255,0.25)' },
  { bg: 'rgba(255,184,63,0.12)', text: 'var(--amber)', border: 'rgba(255,184,63,0.25)' },
  { bg: 'rgba(255,77,106,0.12)', text: 'var(--red)', border: 'rgba(255,77,106,0.25)' },
]
function tagColour(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return TAG_COLOURS[Math.abs(h) % TAG_COLOURS.length]
}
function CategoryTag({ category }: { category: string }) {
  const c = tagColour(category)
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{category}</span>
}

type FullProduct = Product & { competitor_products?: (CompetitorProduct & { competitor?: Competitor })[] }

export default function ProductsPage() {
  const [products, setProducts] = useState<FullProduct[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  // New product form
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)

  // Add competitor URL form (per product)
  const [addingCompetitorFor, setAddingCompetitorFor] = useState<string | null>(null)
  const [cpCompetitorId, setCpCompetitorId] = useState('')
  const [cpUrl, setCpUrl] = useState('')
  const [savingCp, setSavingCp] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadForId = useRef<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/competitors').then(r => r.json()),
    ]).then(([prods, comps]) => {
      setProducts(Array.isArray(prods) ? prods : [])
      setCompetitors(Array.isArray(comps) ? comps : [])
      if (comps.length > 0) setCpCompetitorId(comps[0].id)
      setLoading(false)
    })
  }, [])

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])).sort()]
  const filtered = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory)

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    setSavingProduct(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, category: newCategory || null }),
    })
    const prod = await res.json()
    setProducts(prev => [{ ...prod, competitor_products: [] }, ...prev])
    setNewName(''); setNewCategory(''); setShowAddProduct(false); setSavingProduct(false)
  }

  async function handleAddCompetitorProduct(e: React.FormEvent, productId: string) {
    e.preventDefault()
    setSavingCp(true)
    const res = await fetch('/api/competitor-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, competitor_id: cpCompetitorId, url: cpUrl }),
    })
    const cp = await res.json()
    setProducts(prev => prev.map(p => p.id === productId
      ? { ...p, competitor_products: [...(p.competitor_products ?? []), cp] }
      : p
    ))
    setCpUrl(''); setAddingCompetitorFor(null); setSavingCp(false)
  }

  async function handleRemoveCompetitorProduct(productId: string, cpId: string) {
    await fetch('/api/competitor-products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cpId }),
    })
    setProducts(prev => prev.map(p => p.id === productId
      ? { ...p, competitor_products: p.competitor_products?.filter(cp => cp.id !== cpId) }
      : p
    ))
  }

  async function handleSaveCategory(productId: string) {
    await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productId, category: editCategory || null }),
    })
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, category: editCategory || null } : p))
    setEditingId(null)
  }

  function triggerUpload(productId: string) {
    uploadForId.current = productId
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const productId = uploadForId.current
    if (!file || !productId) return
    setUploadingId(productId)
    const form = new FormData()
    form.append('file', file)
    form.append('product_id', productId)
    const res = await fetch('/api/products/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (data.url) setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_url: data.url } : p))
    setUploadingId(null)
    e.target.value = ''
  }

  return (
    <div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Products</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Track competitor prices for each of your products
          </p>
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
              <button type="submit" disabled={savingProduct} style={{ padding: '9px 20px', borderRadius: 7, background: 'var(--accent)', color: '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                {savingProduct ? 'Creating...' : 'Create Product'}
              </button>
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
              <div style={{ display: 'flex', gap: 0 }}>

                {/* Image */}
                <div onClick={() => triggerUpload(product.id)} style={{ width: 100, minHeight: 80, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                  {uploadingId === product.id ? (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>...</span>
                  ) : product.image_url ? (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                  ) : (
                    <span style={{ fontSize: 20 }}>📷</span>
                  )}
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 5 }}>{product.name}</div>
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setAddingCompetitorFor(addingCompetitorFor === product.id ? null : product.id); if (competitors.length > 0) setCpCompetitorId(competitors[0].id); setCpUrl('') }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'var(--surface2)', color: 'var(--text-dim)', border: '1px solid var(--border-bright)', cursor: 'pointer' }}
                    >
                      ＋ Add Competitor URL
                    </button>
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
                            {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="font-mono" style={{ display: 'block', fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>Product URL on their site</label>
                          <input value={cpUrl} onChange={e => setCpUrl(e.target.value)} required type="url" placeholder="https://competitor.co.uk/equivalent-product" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '8px 10px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => setAddingCompetitorFor(null)} style={{ padding: '8px 12px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>Cancel</button>
                          <button type="submit" disabled={savingCp} style={{ padding: '8px 16px', borderRadius: 7, background: 'var(--purple-dim)', color: 'var(--purple)', fontWeight: 600, fontSize: 12, border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer' }}>
                            {savingCp ? 'Adding...' : 'Submit'}
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Competitor prices */}
              {(product.competitor_products?.length ?? 0) > 0 && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {product.competitor_products?.map((cp, i) => (
                    <div key={cp.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 18px', borderBottom: i < (product.competitor_products?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#4d9fff,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {cp.competitor?.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>{cp.competitor?.name}</div>
                        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cp.url}</div>
                      </div>
                      <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: cp.last_price ? 'var(--text)' : 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>
                        {cp.last_price ? `£${Number(cp.last_price).toFixed(2)}` : '—'}
                      </div>
                      <StatusPill status={cp.status} />
                      <button onClick={() => handleRemoveCompetitorProduct(product.id, cp.id)} style={{ width: 24, height: 24, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {(product.competitor_products?.length ?? 0) === 0 && addingCompetitorFor !== product.id && (
                <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                  No competitor URLs yet — click "Add Competitor URL" to start tracking
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
