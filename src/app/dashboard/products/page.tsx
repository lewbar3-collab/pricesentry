'use client'

import { useState, useEffect, useRef } from 'react'
import type { Product, Competitor } from '@/types'
import StatusPill from '@/components/ui/StatusPill'

const TAG_COLOURS = [
  { bg: 'rgba(0,229,160,0.12)', text: 'var(--accent)', border: 'rgba(0,229,160,0.25)' },
  { bg: 'rgba(167,139,250,0.12)', text: 'var(--purple)', border: 'rgba(167,139,250,0.25)' },
  { bg: 'rgba(77,159,255,0.12)', text: '#4d9fff', border: 'rgba(77,159,255,0.25)' },
  { bg: 'rgba(255,184,63,0.12)', text: 'var(--amber)', border: 'rgba(255,184,63,0.25)' },
  { bg: 'rgba(255,77,106,0.12)', text: 'var(--red)', border: 'rgba(255,77,106,0.25)' },
]

function tagColour(category: string) {
  let hash = 0
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLOURS[Math.abs(hash) % TAG_COLOURS.length]
}

function CategoryTag({ category }: { category: string }) {
  const c = tagColour(category)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, fontSize: 10.5, fontWeight: 500, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
      {category}
    </span>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<(Product & { competitor?: Competitor })[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [competitorId, setCompetitorId] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // Inline edit state
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
      if (comps.length > 0) setCompetitorId(comps[0].id)
      setLoading(false)
    })
  }, [])

  // All unique categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[])).sort()]
  const filtered = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, url, competitor_id: competitorId, category: category || null }),
    })
    const prod = await res.json()
    const comp = competitors.find(c => c.id === competitorId)
    setProducts(prev => [{ ...prod, competitor: comp }, ...prev])
    setName(''); setUrl(''); setCategory(''); setShowForm(false); setSaving(false)
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
    if (data.url) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, image_url: data.url } : p))
    }
    setUploadingId(null)
    e.target.value = ''
  }

  return (
    <div>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Products</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            {products.length} product{products.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, background: 'var(--accent)', color: '#060810', border: 'none', cursor: 'pointer' }}
        >
          ＋ Add Product
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border-bright)', borderRadius: 13, padding: '24px', marginBottom: 20 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Track New Product</div>
          {competitors.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--amber)' }}>⚠️ You need to <a href="/dashboard/competitors" style={{ color: 'var(--accent)' }}>add a competitor</a> first.</p>
          ) : (
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Competitor</label>
                  <select value={competitorId} onChange={e => setCompetitorId(e.target.value)} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', appearance: 'none' }}>
                    {competitors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Product Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} required placeholder="Marble White Panel 2.4m" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Product URL</label>
                  <input value={url} onChange={e => setUrl(e.target.value)} required placeholder="https://competitor.co.uk/product-page" type="url" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none' }} />
                </div>
                <div>
                  <label className="font-mono" style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Category <span style={{ opacity: 0.5 }}>(optional)</span></label>
                  <input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Shower Panels" style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 16px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 13, border: '1px solid var(--border-bright)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 7, background: 'var(--accent)', color: '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  {saving ? 'Submitting...' : 'Submit for Setup'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Our team will configure the scraper and set it live.</p>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Category filter tabs */}
      {categories.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat
            const c = cat !== 'All' ? tagColour(cat) : null
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Mono, monospace', border: '1px solid',
                  background: isActive ? (c?.bg ?? 'var(--accent-dim)') : 'var(--surface)',
                  color: isActive ? (c?.text ?? 'var(--accent)') : 'var(--text-muted)',
                  borderColor: isActive ? (c?.border ?? 'rgba(0,229,160,0.25)') : 'var(--border)',
                }}
              >
                {cat}
                {cat !== 'All' && (
                  <span style={{ marginLeft: 5, opacity: 0.6 }}>
                    {products.filter(p => p.category === cat).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Products grid */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {activeCategory !== 'All' ? `No products in "${activeCategory}"` : 'No products yet.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(product => (
            <div key={product.id} className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden', transition: 'border-color 0.15s' }}>

              {/* Image area */}
              <div
                onClick={() => triggerUpload(product.id)}
                style={{ height: 120, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
              >
                {uploadingId === product.id ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading...</div>
                ) : product.image_url ? (
                  <>
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                    >
                      <span style={{ fontSize: 11, color: 'white', opacity: 0, transition: 'opacity 0.15s', fontFamily: 'DM Mono, monospace' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >📷 Change image</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 22 }}>📷</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>Click to upload image</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.competitor?.domain}</div>
                  </div>
                  <StatusPill status={product.status} />
                </div>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: product.last_price ? 'var(--text)' : 'var(--text-muted)' }}>
                    {product.last_price ? `£${Number(product.last_price).toFixed(2)}` : '—'}
                  </div>
                  {product.last_scraped_at && (
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {(() => {
                        const diff = Math.floor((Date.now() - new Date(product.last_scraped_at).getTime()) / 60000)
                        if (diff < 1) return 'just now'
                        if (diff < 60) return `${diff}m ago`
                        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
                        return `${Math.floor(diff / 1440)}d ago`
                      })()}
                    </div>
                  )}
                </div>

                {/* Category */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {editingId === product.id ? (
                    <div style={{ display: 'flex', gap: 5, flex: 1 }}>
                      <input
                        autoFocus
                        value={editCategory}
                        onChange={e => setEditCategory(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCategory(product.id); if (e.key === 'Escape') setEditingId(null) }}
                        placeholder="Type category..."
                        style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '4px 9px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text)', outline: 'none' }}
                      />
                      <button onClick={() => handleSaveCategory(product.id)} style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--accent)', color: '#060810', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 11, border: '1px solid var(--border)', cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <>
                      {product.category ? (
                        <CategoryTag category={product.category} />
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>No category</span>
                      )}
                      <button
                        onClick={() => { setEditingId(product.id); setEditCategory(product.category ?? '') }}
                        style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
                      >
                        ✏️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
