'use client'

import { useState } from 'react'
import AdminConfigurePanel from './AdminConfigurePanel'
import RefreshButton from './RefreshButton'
import ActivatePendingButton from './ActivatePendingButton'

interface CompetitorProduct {
  id: string
  url: string
  status: string
  last_scraped_at: string | null
}

interface Competitor {
  id: string
  name: string
  domain: string
  scrape_method: string
  sale_price_selector: string | null
  price_selector: string | null
  check_frequency_hours: number
  notes: string | null
  created_at: string
  competitor_products?: CompetitorProduct[]
  profile?: { email: string; company_name: string | null }
}

interface Props {
  pendingCompetitors: Competitor[]
  liveCompetitors: Competitor[]
}

export default function AdminQueuePanel({ pendingCompetitors, liveCompetitors }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const allCompetitors = [...pendingCompetitors, ...liveCompetitors]
  const selected = selectedId ? allCompetitors.find(c => c.id === selectedId) ?? null : pendingCompetitors[0] ?? null
  const sampleProduct = selected?.competitor_products?.[0] ?? null

  function selectCompetitor(id: string) {
    setSelectedId(prev => prev === id ? null : id)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, marginBottom: 20 }}>

      {/* Left: queue list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14 }}>📥 Pending Configuration</div>
          <span className="font-mono" style={{ fontSize: 9, background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,184,63,0.2)', padding: '2px 7px', borderRadius: 10, fontWeight: 500 }}>
            {pendingCompetitors.length} competitors
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1.5fr 80px 1fr 60px', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
          {['', 'Competitor', 'Client', 'Products', 'Submitted', 'Visit'].map(h => (
            <div key={h} className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</div>
          ))}
        </div>

        {pendingCompetitors.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            🎉 Queue is empty — all competitors are configured!
          </div>
        )}

        {pendingCompetitors.map((competitor, i) => {
          const isFirst = i === 0
          const isSelected = (selectedId === competitor.id) || (!selectedId && isFirst)
          const productCount = competitor.competitor_products?.length ?? 0
          const pendingCount = competitor.competitor_products?.filter(cp => cp.status === 'pending').length ?? 0
          return (
            <div
              key={competitor.id}
              onClick={() => selectCompetitor(competitor.id)}
              style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1.5fr 80px 1fr 60px', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)', gap: 12, background: isSelected ? 'rgba(167,139,250,0.06)' : 'transparent', borderLeft: isSelected ? '2px solid var(--purple)' : '2px solid transparent', cursor: 'pointer', transition: 'background 0.15s' }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: isSelected ? 'var(--purple)' : 'var(--amber)', boxShadow: isSelected ? '0 0 6px rgba(167,139,250,0.5)' : 'none' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{competitor.name}</div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{competitor.domain}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {competitor.profile?.company_name || competitor.profile?.email}
              </div>
              <div>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--amber)' }}>{pendingCount}</span>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}> / {productCount}</span>
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {(() => {
                  const diff = Math.floor((Date.now() - new Date(competitor.created_at).getTime()) / 60000)
                  if (diff < 60) return `${diff}m ago`
                  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
                  return `${Math.floor(diff / 1440)}d ago`
                })()}
              </div>
              <a href={`https://${competitor.domain}`} target="_blank" onClick={e => e.stopPropagation()} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none' }}>↗</a>
            </div>
          )
        })}

        {/* Live competitors */}
        {liveCompetitors.length > 0 && (
          <>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,229,160,0.02)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              <span className="font-mono" style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live — {liveCompetitors.length} configured</span>
            </div>
            {liveCompetitors.map(competitor => {
              const liveCount = competitor.competitor_products?.filter(cp => cp.status === 'live').length ?? 0
              const pendingCount = competitor.competitor_products?.filter(cp => cp.status === 'pending').length ?? 0
              const isSelected = selectedId === competitor.id
              const lastScraped = competitor.competitor_products?.reduce((latest: string | null, p) => {
                if (!p.last_scraped_at) return latest
                if (!latest) return p.last_scraped_at
                return p.last_scraped_at > latest ? p.last_scraped_at : latest
              }, null)

              return (
                <div key={competitor.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)', gap: 14, background: isSelected ? 'rgba(0,229,160,0.04)' : 'transparent', borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent', transition: 'background 0.15s' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: pendingCount > 0 ? 'var(--amber)' : 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{competitor.name}</div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {competitor.domain} · {liveCount} live{pendingCount > 0 ? ` · ` : ''}
                      {pendingCount > 0 && <span style={{ color: 'var(--amber)' }}>{pendingCount} pending</span>}
                      {lastScraped && ` · last scraped ${(() => {
                        const diff = Math.floor((Date.now() - new Date(lastScraped).getTime()) / 60000)
                        if (diff < 1) return 'just now'
                        if (diff < 60) return `${diff}m ago`
                        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
                        return `${Math.floor(diff / 1440)}d ago`
                      })()}`}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', minWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {competitor.profile?.company_name || competitor.profile?.email}
                  </div>
                  {pendingCount > 0 && <ActivatePendingButton competitorId={competitor.id} count={pendingCount} />}
                  <RefreshButton competitorId={competitor.id} productCount={liveCount} />
                  {/* Edit selector button */}
                  <button
                    onClick={() => selectCompetitor(competitor.id)}
                    title="Edit scraper config"
                    style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: `1px solid ${isSelected ? 'rgba(0,229,160,0.3)' : 'var(--border)'}`, background: isSelected ? 'var(--accent-dim)' : 'transparent', color: isSelected ? 'var(--accent)' : 'var(--text-dim)', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                  >
                    ✏️
                  </button>
                  <a href={`https://${competitor.domain}`} target="_blank" style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', textDecoration: 'none', flexShrink: 0 }}>↗</a>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Right: configure panel */}
      <AdminConfigurePanel competitor={selected} sampleProduct={sampleProduct} />
    </div>
  )
}
