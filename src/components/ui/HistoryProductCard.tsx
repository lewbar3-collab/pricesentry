'use client'

import { useState } from 'react'

interface HistoryEntry {
  id: string
  price: number
  scraped_at: string
}

interface CompetitorTab {
  id: string
  name: string
  domain: string
  status: string
  lastPrice: number | null
  history: HistoryEntry[]
  is_own_company?: boolean
}

interface Props {
  product: { id: string; name: string; category: string | null; image_url: string | null }
  competitorTabs: CompetitorTab[]
  animationDelay: number
}

const STATUS_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  live:    { bg: 'var(--accent-dim)',        text: 'var(--accent)', border: 'rgba(0,229,160,0.2)' },
  pending: { bg: 'var(--amber-dim)',         text: 'var(--amber)',  border: 'rgba(255,184,63,0.2)' },
  error:   { bg: 'rgba(255,77,106,0.1)',     text: 'var(--red)',    border: 'rgba(255,77,106,0.2)' },
  paused:  { bg: 'rgba(140,149,168,0.1)',    text: '#8c95a8',       border: 'rgba(140,149,168,0.15)' },
}

function Sparkline({ entries, color }: { entries: HistoryEntry[]; color: string }) {
  if (entries.length < 2) return null
  const prices = entries.map(e => Number(e.price))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const w = 320
  const h = 56
  const pad = 4

  // newest on right, so reverse
  const pts = [...entries].reverse()
  const points = pts.map((e, i) => {
    const x = pad + (i / (pts.length - 1)) * (w - pad * 2)
    const y = h - pad - ((Number(e.price) - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const lastX = pad + (w - pad * 2)
  const lastY = h - pad - ((Number(pts[pts.length - 1].price) - min) / range) * (h - pad * 2)

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', height: 56 }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    </svg>
  )
}

export default function HistoryProductCard({ product, competitorTabs, animationDelay }: Props) {
  const [activeTab, setActiveTab] = useState(0)

  const tab = competitorTabs[activeTab] ?? competitorTabs[0]

  if (!tab) return null

  const entries = tab.history
  const prices = entries.map(e => Number(e.price))
  const minPrice = prices.length ? Math.min(...prices) : null
  const maxPrice = prices.length ? Math.max(...prices) : null
  const latest = entries[0]
  const previous = entries[1]
  const change = latest && previous ? Number(latest.price) - Number(previous.price) : null
  const changePct = change !== null && previous ? ((change / Number(previous.price)) * 100) : null

  return (
    <div
      className="animate-fade-up"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 13,
        overflow: 'hidden',
        animationDelay: `${animationDelay}s`,
      }}
    >
      {/* Product header */}
      <div style={{ display: 'flex', gap: 0 }}>
        {product.image_url && (
          <div style={{ width: 72, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
          </div>
        )}
        <div style={{ flex: 1, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{product.name}</div>
            {product.category && (
              <div className="font-mono" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 3 }}>{product.category}</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {change !== null && change !== 0 && (
              <div style={{ textAlign: 'right' }}>
                <div className="font-mono" style={{ fontSize: 11, color: change < 0 ? 'var(--accent)' : 'var(--red)', fontWeight: 600 }}>
                  {change < 0 ? '▼' : '▲'} £{Math.abs(change).toFixed(2)}
                  {changePct !== null && <span style={{ opacity: 0.7 }}> ({Math.abs(changePct).toFixed(1)}%)</span>}
                </div>
                <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>since last scrape</div>
              </div>
            )}
            {latest && (
              <div className="font-mono" style={{ fontSize: 18, fontWeight: 800, color: change && change < 0 ? 'var(--accent)' : change && change > 0 ? 'var(--red)' : 'var(--text)' }}>
                £{Number(latest.price).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Competitor tabs */}
      {competitorTabs.length > 1 && (
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {competitorTabs.map((t, i) => {
            const isActive = i === activeTab
            const sc = STATUS_COLOURS[t.status] ?? STATUS_COLOURS.pending
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', border: 'none', cursor: 'pointer',
                  background: isActive ? (t.is_own_company ? 'rgba(0,229,160,0.06)' : 'var(--surface2)') : 'transparent',
                  borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-muted)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: 6, background: t.is_own_company ? 'var(--accent-dim)' : 'linear-gradient(135deg,#4d9fff,#a78bfa)', border: t.is_own_company ? '1px solid rgba(0,229,160,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: t.is_own_company ? 12 : 9, fontWeight: 700, color: t.is_own_company ? 'var(--accent)' : '#fff', flexShrink: 0 }}>
                  {t.is_own_company ? '🏠' : t.name.slice(0, 2).toUpperCase()}
                </div>
                {t.name}
                {t.is_own_company && (
                  <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.3)', padding: '1px 5px', borderRadius: 8 }}>YOU</span>
                )}
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontFamily: 'DM Mono, monospace' }}>
                  {t.status}
                </span>
                {t.lastPrice && (
                  <span className="font-mono" style={{ fontSize: 11, color: t.is_own_company ? 'var(--accent)' : 'var(--text-dim)', fontWeight: t.is_own_company ? 700 : 400 }}>
                    £{Number(t.lastPrice).toFixed(2)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Single competitor label (no tabs needed) */}
      {competitorTabs.length === 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderTop: '1px solid var(--border)', background: tab.is_own_company ? 'rgba(0,229,160,0.04)' : 'var(--surface2)' }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: tab.is_own_company ? 'var(--accent-dim)' : 'linear-gradient(135deg,#4d9fff,#a78bfa)', border: tab.is_own_company ? '1px solid rgba(0,229,160,0.4)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: tab.is_own_company ? 12 : 9, fontWeight: 700, color: tab.is_own_company ? 'var(--accent)' : '#fff' }}>
            {tab.is_own_company ? '🏠' : tab.name.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{tab.name}</span>
          {tab.is_own_company && <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.3)', padding: '1px 6px', borderRadius: 8 }}>YOUR COMPANY</span>}
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tab.domain}</span>
          {(() => { const sc = STATUS_COLOURS[tab.status] ?? STATUS_COLOURS.pending; return (
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontFamily: 'DM Mono, monospace' }}>{tab.status}</span>
          )})()}
        </div>
      )}

      {/* Chart + history */}
      {entries.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>
          {tab.status === 'pending' ? 'Awaiting admin setup before scraping begins' : tab.status === 'error' ? 'Last scrape failed — check admin logs' : 'No history yet — waiting for first scrape'}
        </div>
      ) : (
        <>
          {/* Sparkline */}
          <div style={{ padding: '12px 20px 0', background: 'rgba(0,0,0,0.15)' }}>
            <Sparkline entries={entries.slice(0, 50)} color="var(--accent)" />
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 24, padding: '10px 20px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border)' }}>
            {minPrice !== null && <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Low <span style={{ color: 'var(--accent)', fontWeight: 600 }}>£{minPrice.toFixed(2)}</span></div>}
            {maxPrice !== null && <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>High <span style={{ color: 'var(--red)', fontWeight: 600 }}>£{maxPrice.toFixed(2)}</span></div>}
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{entries.length} data point{entries.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Price log */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {entries.slice(0, 30).map((entry, i) => {
              const prev = entries[i + 1]
              const diff = prev ? Number(entry.price) - Number(prev.price) : null
              const isLatest = i === 0
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr auto',
                    alignItems: 'center',
                    padding: '9px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: isLatest ? 'rgba(0,229,160,0.03)' : 'transparent',
                    gap: 12,
                  }}
                >
                  <div className="font-mono" style={{ fontSize: 13, fontWeight: 700, color: diff && diff < 0 ? 'var(--accent)' : diff && diff > 0 ? 'var(--red)' : 'var(--text)' }}>
                    £{Number(entry.price).toFixed(2)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {diff !== null ? (
                      diff === 0 ? (
                        <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>no change</span>
                      ) : (
                        <span className="font-mono" style={{ fontSize: 10, color: diff < 0 ? 'var(--accent)' : 'var(--red)', background: diff < 0 ? 'var(--accent-dim)' : 'rgba(255,77,106,0.1)', padding: '2px 7px', borderRadius: 4, border: `1px solid ${diff < 0 ? 'rgba(0,229,160,0.2)' : 'rgba(255,77,106,0.2)'}` }}>
                          {diff < 0 ? '▼' : '▲'} £{Math.abs(diff).toFixed(2)}
                        </span>
                      )
                    ) : null}
                    {isLatest && (
                      <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(0,229,160,0.2)' }}>latest</span>
                    )}
                  </div>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                    {new Date(entry.scraped_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
