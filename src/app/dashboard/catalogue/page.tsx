'use client'

import { useState, useEffect } from 'react'
import type { Competitor, CatalogueEntry } from '@/types'

const sectionStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 13,
  overflow: 'hidden' as const,
}

const labelStyle = {
  display: 'block',
  fontSize: 10,
  color: 'var(--text-muted)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  marginBottom: 6,
  fontFamily: 'DM Mono, monospace',
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg)',
  border: '1px solid var(--border-bright)',
  borderRadius: 7,
  padding: '9px 12px',
  fontFamily: 'DM Mono, monospace',
  fontSize: 12,
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box' as const,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface CompetitorWithCatalogue extends Competitor {
  catalogue_url: string | null
  catalogue_schedule: 'daily' | 'weekly' | null
  catalogue_last_scraped_at: string | null
  catalogue_product_count: number
}

export default function CataloguePage() {
  const [competitors, setCompetitors] = useState<CompetitorWithCatalogue[]>([])
  const [loading, setLoading]         = useState(true)

  // Per-competitor scrape UI state
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [storeUrls, setStoreUrls]     = useState<Record<string, string>>({})
  const [scraping, setScraping]       = useState<Record<string, boolean>>({})
  const [scrapeResult, setScrapeResult] = useState<Record<string, { count?: number; error?: string }>>({})
  const [schedules, setSchedules]     = useState<Record<string, string>>({})

  // Preview entries
  const [previewId, setPreviewId]     = useState<string | null>(null)
  const [entries, setEntries]         = useState<CatalogueEntry[]>([])
  const [entrySearch, setEntrySearch] = useState('')
  const [loadingEntries, setLoadingEntries] = useState(false)

  useEffect(() => {
    fetch('/api/competitors')
      .then(r => r.json())
      .then(data => {
        const comps = (Array.isArray(data) ? data : []) as CompetitorWithCatalogue[]
        setCompetitors(comps.filter(c => !c.is_own_company))
        const urlMap: Record<string, string> = {}
        const schMap: Record<string, string> = {}
        comps.forEach(c => {
          urlMap[c.id] = c.catalogue_url ?? ''
          schMap[c.id] = c.catalogue_schedule ?? 'none'
        })
        setStoreUrls(urlMap)
        setSchedules(schMap)
        setLoading(false)
      })
  }, [])

  async function handleScrape(comp: CompetitorWithCatalogue) {
    const url = storeUrls[comp.id]?.trim()
    if (!url) return
    setScraping(prev => ({ ...prev, [comp.id]: true }))
    setScrapeResult(prev => ({ ...prev, [comp.id]: {} }))
    try {
      const res  = await fetch('/api/catalogue/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: comp.id, store_url: url }),
      })
      const data = await res.json()
      if (res.ok) {
        setScrapeResult(prev => ({ ...prev, [comp.id]: { count: data.count } }))
        setCompetitors(prev => prev.map(c => c.id === comp.id
          ? { ...c, catalogue_url: url, catalogue_last_scraped_at: new Date().toISOString(), catalogue_product_count: data.count }
          : c
        ))
        // Auto-show preview
        loadEntries(comp.id, '')
        setPreviewId(comp.id)
      } else {
        setScrapeResult(prev => ({ ...prev, [comp.id]: { error: data.error } }))
      }
    } catch {
      setScrapeResult(prev => ({ ...prev, [comp.id]: { error: 'Network error' } }))
    }
    setScraping(prev => ({ ...prev, [comp.id]: false }))
  }

  async function handleScheduleChange(compId: string, value: string) {
    setSchedules(prev => ({ ...prev, [compId]: value }))
    await fetch('/api/catalogue', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitor_id: compId, catalogue_schedule: value === 'none' ? null : value }),
    })
    setCompetitors(prev => prev.map(c => c.id === compId
      ? { ...c, catalogue_schedule: value === 'none' ? null : value as 'daily' | 'weekly' }
      : c
    ))
  }

  async function loadEntries(compId: string, q: string) {
    setLoadingEntries(true)
    const res = await fetch(`/api/catalogue?competitor_id=${compId}&q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setEntries(Array.isArray(data) ? data : [])
    setLoadingEntries(false)
  }

  function togglePreview(compId: string) {
    if (previewId === compId) {
      setPreviewId(null)
    } else {
      setPreviewId(compId)
      setEntrySearch('')
      loadEntries(compId, '')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>
          Competitor Catalogue
        </h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Import full product listings from competitor Shopify stores — use them to quickly link tracked products
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : competitors.length === 0 ? (
        <div style={{ ...sectionStyle, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No competitors added yet. Add competitors first, then import their catalogues here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {competitors.map((comp, i) => {
            const isExpanded  = expandedId === comp.id
            const isPreviewing = previewId === comp.id
            const result      = scrapeResult[comp.id]
            const isScraping  = scraping[comp.id]
            const hasCatalogue = (comp.catalogue_product_count ?? 0) > 0

            return (
              <div
                key={comp.id}
                className="animate-fade-up"
                style={{ ...sectionStyle, animationDelay: `${i * 0.04}s`, border: hasCatalogue ? '1px solid rgba(0,229,160,0.15)' : '1px solid var(--border)' }}
              >
                {/* Header row */}
                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: hasCatalogue ? 'var(--accent-dim)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {hasCatalogue ? '📚' : '🏢'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{comp.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{comp.domain}</span>
                      {hasCatalogue ? (
                        <>
                          <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.2)', padding: '1px 7px', borderRadius: 5 }}>
                            {comp.catalogue_product_count} products
                          </span>
                          {comp.catalogue_last_scraped_at && (
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              scraped {timeAgo(comp.catalogue_last_scraped_at)}
                            </span>
                          )}
                          {comp.catalogue_schedule && (
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--purple)', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', padding: '1px 7px', borderRadius: 5 }}>
                              🔄 {comp.catalogue_schedule}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--amber)' }}>No catalogue yet</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {hasCatalogue && (
                      <button
                        onClick={() => togglePreview(comp.id)}
                        style={{ padding: '7px 13px', borderRadius: 7, background: isPreviewing ? 'var(--accent-dim)' : 'var(--surface2)', color: isPreviewing ? 'var(--accent)' : 'var(--text-dim)', fontSize: 12, border: `1px solid ${isPreviewing ? 'rgba(0,229,160,0.25)' : 'var(--border-bright)'}`, cursor: 'pointer' }}
                      >
                        {isPreviewing ? '✕ Close' : '👁 Browse'}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : comp.id)}
                      style={{ padding: '7px 13px', borderRadius: 7, background: isExpanded ? 'var(--accent-dim)' : 'var(--surface2)', color: isExpanded ? 'var(--accent)' : 'var(--text-dim)', fontSize: 12, border: `1px solid ${isExpanded ? 'rgba(0,229,160,0.25)' : 'var(--border-bright)'}`, cursor: 'pointer' }}
                    >
                      {isExpanded ? '✕ Cancel' : hasCatalogue ? '🔄 Re-import' : '＋ Import'}
                    </button>
                  </div>
                </div>

                {/* Import panel */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(0,229,160,0.15)', padding: '20px 22px', background: 'rgba(0,229,160,0.02)' }}>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 16 }}>
                      {hasCatalogue ? 'Re-import Catalogue' : 'Import Catalogue'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 14, alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>Shopify Store URL</label>
                        <input
                          value={storeUrls[comp.id] ?? ''}
                          onChange={e => setStoreUrls(prev => ({ ...prev, [comp.id]: e.target.value }))}
                          placeholder="e.g. wetwall.co.uk or https://wetwall.myshopify.com"
                          style={inputStyle}
                        />
                      </div>
                      <button
                        onClick={() => handleScrape(comp)}
                        disabled={isScraping || !storeUrls[comp.id]?.trim()}
                        style={{ padding: '9px 20px', borderRadius: 7, background: isScraping ? 'var(--surface2)' : 'var(--accent)', color: isScraping ? 'var(--text-muted)' : '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: isScraping ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                      >
                        {isScraping ? '⏳ Scraping...' : '🚀 Import'}
                      </button>
                    </div>

                    {/* Schedule */}
                    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10, alignItems: 'start' }}>
                      <div>
                        <label style={labelStyle}>Auto re-import</label>
                        <select
                          value={schedules[comp.id] ?? 'none'}
                          onChange={e => handleScheduleChange(comp.id, e.target.value)}
                          style={{ ...inputStyle, appearance: 'none' }}
                        >
                          <option value="none">Off</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                      <div style={{ paddingTop: 22 }}>
                        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0 }}>
                          Re-import will pick up new products the competitor adds to their store. Only Shopify stores are supported.
                        </p>
                      </div>
                    </div>

                    {/* Result feedback */}
                    {result && (
                      <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, background: result.error ? 'rgba(255,77,106,0.07)' : 'rgba(0,229,160,0.07)', border: `1px solid ${result.error ? 'rgba(255,77,106,0.2)' : 'rgba(0,229,160,0.2)'}` }}>
                        {result.error ? (
                          <span className="font-mono" style={{ fontSize: 12, color: 'var(--red)' }}>❌ {result.error}</span>
                        ) : (
                          <span className="font-mono" style={{ fontSize: 12, color: 'var(--accent)' }}>✓ Imported {result.count} products successfully</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Browse / preview panel */}
                {isPreviewing && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      <input
                        value={entrySearch}
                        onChange={e => { setEntrySearch(e.target.value); loadEntries(comp.id, e.target.value) }}
                        placeholder="Search catalogue..."
                        style={{ ...inputStyle, maxWidth: 340 }}
                      />
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {loadingEntries ? 'searching...' : `${entries.length} results`}
                      </span>
                    </div>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                      {entries.length === 0 && !loadingEntries ? (
                        <div style={{ padding: '32px 22px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                          No products found
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 1, background: 'var(--border)' }}>
                          {entries.map(entry => (
                            <div key={entry.id} style={{ background: 'var(--surface)', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              {entry.image_url ? (
                                <img src={entry.image_url} alt={entry.title} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: 'var(--surface2)' }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--surface2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📦</div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</div>
                                {entry.price_min !== null && (
                                  <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--accent)' }}>
                                    £{Number(entry.price_min).toFixed(2)}
                                    {entry.price_max !== null && entry.price_max !== entry.price_min && ` – £${Number(entry.price_max).toFixed(2)}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
