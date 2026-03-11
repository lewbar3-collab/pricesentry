'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Product, Competitor, CompetitorProduct } from '@/types'

type FullProduct = Product & {
  competitor_products?: (CompetitorProduct & { competitor?: Competitor })[]
}

// ── Palette for multiple competitors ──────────────────────────────────────
const COMPETITOR_COLOURS = [
  { stroke: 'rgba(167,139,250,0.9)', fill: '#a78bfa', label: 'var(--purple)' },
  { stroke: 'rgba(77,159,255,0.9)',  fill: '#4d9fff', label: '#4d9fff' },
  { stroke: 'rgba(255,184,63,0.9)',  fill: '#ffb83f', label: 'var(--amber)' },
  { stroke: 'rgba(255,77,106,0.9)',  fill: '#ff4d6a', label: 'var(--red)' },
  { stroke: 'rgba(251,191,36,0.9)',  fill: '#fbbf24', label: '#fbbf24' },
  { stroke: 'rgba(52,211,153,0.9)',  fill: '#34d399', label: '#34d399' },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function calcTotal(unitPrice: number, qty: number, deliveryCost: number | null, freeThreshold: number | null) {
  const subtotal = unitPrice * qty
  const delivery = freeThreshold !== null && subtotal >= freeThreshold ? 0 : (deliveryCost ?? 0)
  return { subtotal, delivery, total: subtotal + delivery }
}

function crossoverQty(
  myPrice: number, myDelivery: number | null, myThreshold: number | null,
  theirPrice: number, theirDelivery: number | null, theirThreshold: number | null,
  maxQty: number
): number | null {
  for (let q = 1; q <= maxQty; q++) {
    if (calcTotal(myPrice, q, myDelivery, myThreshold).total <= calcTotal(theirPrice, q, theirDelivery, theirThreshold).total) return q
  }
  return null
}

// ── Multi-competitor chart ─────────────────────────────────────────────────

function CostChart({ myPrice, myLabel, myDelivery, myThreshold, rivals, maxQty, currentQty }: {
  myPrice: number; myLabel: string; myDelivery: number | null; myThreshold: number | null
  rivals: { name: string; price: number; delivery: number | null; threshold: number | null; colour: typeof COMPETITOR_COLOURS[0] }[]
  maxQty: number; currentQty: number
}) {
  const W = 600; const H = 240; const PAD = { top: 20, right: 16, bottom: 36, left: 58 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const qs = Array.from({ length: maxQty }, (_, i) => i + 1)
  const myTotals    = qs.map(q => calcTotal(myPrice, q, myDelivery, myThreshold).total)
  const rivalTotals = rivals.map(r => qs.map(q => calcTotal(r.price, q, r.delivery, r.threshold).total))

  const allVals = [...myTotals, ...rivalTotals.flat()]
  const maxVal  = Math.max(...allVals)

  const xScale = (q: number) => PAD.left + ((q - 1) / Math.max(maxQty - 1, 1)) * chartW
  const yScale = (v: number) => PAD.top + chartH - (v / maxVal) * chartH
  const pathD  = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i + 1).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ')

  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((maxVal / 5) * i))
  const tickStep = Math.ceil(maxQty / Math.min(maxQty, 10))
  const xTicks = Array.from({ length: Math.floor(maxQty / tickStep) + 1 }, (_, i) => Math.min(i * tickStep + 1, maxQty))
  const curX = xScale(currentQty)

  // Legend rows: 2 per line
  const legendItems = [
    { label: myLabel, fill: 'rgba(0,229,160,0.9)' },
    ...rivals.map((r, i) => ({ label: r.name, fill: rivals[i].colour.fill })),
  ]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {yTicks.map(v => (
        <line key={v} x1={PAD.left} x2={W - PAD.right} y1={yScale(v)} y2={yScale(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}
      {yTicks.map(v => (
        <text key={v} x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="DM Mono, monospace">£{v}</text>
      ))}
      {xTicks.map(q => (
        <text key={q} x={xScale(q)} y={H - PAD.bottom + 16} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="DM Mono, monospace">{q}</text>
      ))}
      <text x={PAD.left + chartW / 2} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={9} fontFamily="DM Mono, monospace">Quantity (panels)</text>

      {/* Rival lines */}
      {rivals.map((r, i) => (
        <path key={i} d={pathD(rivalTotals[i])} fill="none" stroke={r.colour.stroke} strokeWidth={2} strokeLinejoin="round" />
      ))}
      {/* My line on top */}
      <path d={pathD(myTotals)} fill="none" stroke="rgba(0,229,160,0.9)" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Crossover markers */}
      {rivals.map((r, i) => {
        const cross = crossoverQty(myPrice, myDelivery, myThreshold, r.price, r.delivery, r.threshold, maxQty)
        if (!cross) return null
        const cx = xScale(cross)
        const cy = yScale(calcTotal(myPrice, cross, myDelivery, myThreshold).total)
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(255,184,63,0.3)" strokeWidth={1} strokeDasharray="3,3" />
            <circle cx={cx} cy={cy} r={4} fill={r.colour.fill} />
          </g>
        )
      })}

      {/* Current qty line */}
      <line x1={curX} x2={curX} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4,3" />

      {/* Legend */}
      {legendItems.map((item, i) => (
        <g key={i}>
          <circle cx={PAD.left + 8 + (i % 3) * 120} cy={PAD.top - 8 + Math.floor(i / 3) * 14} r={4} fill={item.fill} />
          <text x={PAD.left + 16 + (i % 3) * 120} y={PAD.top - 4 + Math.floor(i / 3) * 14} fill="rgba(255,255,255,0.55)" fontSize={9} fontFamily="DM Mono, monospace">{item.label}</text>
        </g>
      ))}
    </svg>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [products, setProducts]       = useState<FullProduct[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading]         = useState(true)

  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedCpIds, setSelectedCpIds]         = useState<string[]>([])   // multi-select
  const [myUnitPrice, setMyUnitPrice]             = useState<string>('')
  const [myDelivery, setMyDelivery]               = useState<string>('')
  const [myThreshold, setMyThreshold]             = useState<string>('')
  const [quantity, setQuantity]                   = useState(5)
  const [maxQty, setMaxQty]                       = useState(30)
  const [showMyDeliveryEditor, setShowMyDeliveryEditor] = useState(false)
  const [editingDeliveryFor, setEditingDeliveryFor] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/competitors').then(r => r.json()),
    ]).then(([prods, comps]) => {
      setProducts(Array.isArray(prods) ? prods : [])
      setCompetitors(Array.isArray(comps) ? comps : [])
      setLoading(false)
    })
  }, [])

  const selectedProduct = products.find(p => p.id === selectedProductId)

  const ownCp = selectedProduct?.competitor_products?.find(cp =>
    competitors.find(c => c.id === cp.competitor_id)?.is_own_company && cp.last_price
  )
  const ownCompetitorOnProduct = ownCp ? competitors.find(c => c.id === ownCp.competitor_id) : null
  const hasOwnCpOnProduct = !!ownCp

  // All non-own competitor products with a price, for this product
  const competitorOptions = (selectedProduct?.competitor_products ?? []).filter(cp => {
    const comp = competitors.find(c => c.id === cp.competitor_id)
    return cp.last_price && !comp?.is_own_company
  })

  const toggleCp = (cpId: string) => {
    setSelectedCpIds(prev =>
      prev.includes(cpId) ? prev.filter(id => id !== cpId) : [...prev, cpId]
    )
  }

  // Auto-select first product on load
  useEffect(() => {
    if (products.length && !selectedProductId) {
      const first = products.find(p => p.competitor_products?.some(cp => cp.last_price))
      if (first) setSelectedProductId(first.id)
    }
  }, [products])

  // When product changes: auto-select all rivals + fill own pricing
  useEffect(() => {
    if (!selectedProduct) return
    const rivalIds = (selectedProduct.competitor_products ?? [])
      .filter(cp => {
        const comp = competitors.find(c => c.id === cp.competitor_id)
        return cp.last_price && !comp?.is_own_company
      })
      .map(cp => cp.id)
    setSelectedCpIds(rivalIds)

    const ownEntry = selectedProduct.competitor_products?.find(cp =>
      competitors.find(c => c.id === cp.competitor_id)?.is_own_company && cp.last_price
    )
    if (ownEntry) {
      const ownComp = competitors.find(c => c.id === ownEntry.competitor_id)
      setMyUnitPrice(String(ownEntry.last_price ?? ''))
      setMyDelivery(ownComp?.delivery_cost?.toString() ?? '')
      setMyThreshold(ownComp?.free_delivery_threshold?.toString() ?? '')
    } else {
      setMyUnitPrice(''); setMyDelivery(''); setMyThreshold('')
    }
  }, [selectedProductId])

  const handleCompetitorSaved = useCallback((updated: Competitor) => {
    setCompetitors(prev => prev.map(c => c.id === updated.id ? updated : c))
  }, [])

  const myPriceNum  = myUnitPrice ? parseFloat(myUnitPrice) : null
  const myDelNum    = myDelivery ? parseFloat(myDelivery) : null
  const myThreshNum = myThreshold ? parseFloat(myThreshold) : null

  type Rival = {
    cpId: string
    cp: CompetitorProduct & { competitor?: Competitor }
    comp: Competitor
    price: number
    delivery: number | null
    threshold: number | null
    colour: typeof COMPETITOR_COLOURS[0]
  }

  // Build selected rivals array
  const selectedRivals = selectedCpIds
    .map((cpId, i) => {
      const cp   = competitorOptions.find(c => c.id === cpId)
      const comp = cp ? competitors.find(c => c.id === cp.competitor_id) : null
      if (!cp || !comp || !cp.last_price) return null
      return {
        cpId,
        cp,
        comp,
        price:     Number(cp.last_price),
        delivery:  comp.delivery_cost ?? null,
        threshold: comp.free_delivery_threshold ?? null,
        colour:    COMPETITOR_COLOURS[i % COMPETITOR_COLOURS.length],
      }
    })
    .filter(Boolean) as Rival[]



  const canSimulate = myPriceNum !== null && selectedRivals.length > 0
  const myTotals    = canSimulate ? calcTotal(myPriceNum!, quantity, myDelNum, myThreshNum) : null

  const inputStyle = { width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 6, fontFamily: 'DM Mono, monospace' }
  const poundInput = (val: string, set: (v: string) => void, placeholder: string) => (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace', pointerEvents: 'none' }}>£</span>
      <input type="number" step="0.01" min="0" value={val} onChange={e => set(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, paddingLeft: 24 }} />
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Landed Cost Simulator</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Compare total landed costs including delivery — find the exact quantity crossover point
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, alignItems: 'start' }}>

          {/* ── Left panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Product select */}
            <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '18px 20px' }}>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📦 Select Product</div>
              <label style={labelStyle}>Your Product</label>
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">— choose a product —</option>
                {products.filter(p => p.competitor_products?.some(cp => cp.last_price)).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Your pricing */}
            {hasOwnCpOnProduct ? (
              <div className="animate-fade-up delay-100" style={{ background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 13, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🏠</span>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{ownCompetitorOnProduct?.name ?? 'Your Company'}</div>
                    <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.3)', padding: '1px 6px', borderRadius: 8 }}>AUTO-FILLED</span>
                  </div>
                  <button onClick={() => setShowMyDeliveryEditor(!showMyDeliveryEditor)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                    {showMyDeliveryEditor ? 'Close' : '✏️ Edit'}
                  </button>
                </div>
                {showMyDeliveryEditor ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div><label style={labelStyle}>Unit Price</label>{poundInput(myUnitPrice, setMyUnitPrice, '0.00')}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div><label style={labelStyle}>Delivery</label>{poundInput(myDelivery, setMyDelivery, '0.00')}</div>
                      <div><label style={labelStyle}>Free Over</label>{poundInput(myThreshold, setMyThreshold, '50')}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                      <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Unit Price</div>
                      <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{myUnitPrice ? `£${parseFloat(myUnitPrice).toFixed(2)}` : '—'}</div>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                      <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Delivery</div>
                      <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        {myDelivery ? `£${parseFloat(myDelivery).toFixed(2)}` : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>not set</span>}
                      </div>
                      {myThreshold && <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--accent)', marginTop: 2 }}>free over £{parseFloat(myThreshold).toFixed(2)}</div>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-fade-up delay-100" style={{ background: 'var(--surface)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 13, padding: '18px 20px' }}>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: 'var(--accent)' }}>🏷 Your Pricing</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div><label style={labelStyle}>Unit Price</label>{poundInput(myUnitPrice, setMyUnitPrice, '0.00')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><label style={labelStyle}>Delivery</label>{poundInput(myDelivery, setMyDelivery, '0.00')}</div>
                    <div><label style={labelStyle}>Free Over</label>{poundInput(myThreshold, setMyThreshold, '50')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Competitor multi-select */}
            {selectedProduct && competitorOptions.length > 0 && (
              <div className="animate-fade-up delay-150" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="font-display" style={{ fontWeight: 700, fontSize: 13 }}>🏪 Compare Against</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSelectedCpIds(competitorOptions.map(c => c.id))} style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>all</button>
                    <span style={{ color: 'var(--border-bright)', fontSize: 10 }}>·</span>
                    <button onClick={() => setSelectedCpIds([])} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>none</button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {competitorOptions.map((cp, i) => {
                    const comp    = competitors.find(c => c.id === cp.competitor_id)
                    const checked = selectedCpIds.includes(cp.id)
                    const colour  = COMPETITOR_COLOURS[i % COMPETITOR_COLOURS.length]
                    return (
                      <label key={cp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '9px 12px', borderRadius: 8, background: checked ? 'rgba(167,139,250,0.05)' : 'var(--bg)', border: `1px solid ${checked ? 'rgba(167,139,250,0.25)' : 'var(--border-bright)'}`, transition: 'all 0.12s', userSelect: 'none' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? colour.fill : 'var(--border-bright)'}`, background: checked ? colour.fill : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}>
                          {checked && <span style={{ color: '#060810', fontSize: 10, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                        </div>
                        <input type="checkbox" checked={checked} onChange={() => toggleCp(cp.id)} style={{ display: 'none' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp?.name}</div>
                          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>£{Number(cp.last_price).toFixed(2)} · {comp?.delivery_cost != null ? `🚚 £${Number(comp.delivery_cost).toFixed(2)}` : 'no delivery info'}</div>
                        </div>
                        {/* Edit delivery inline */}
                        <button
                          onClick={e => { e.preventDefault(); setEditingDeliveryFor(editingDeliveryFor === cp.id ? null : cp.id) }}
                          style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
                          title="Edit delivery"
                        >✏️</button>
                      </label>
                    )
                  })}
                </div>

                {/* Inline delivery editor for whichever competitor is being edited */}
                {editingDeliveryFor && (() => {
                  const cp   = competitorOptions.find(c => c.id === editingDeliveryFor)
                  const comp = cp ? competitors.find(c => c.id === cp.competitor_id) : null
                  if (!comp) return null
                  return (
                    <DeliveryEditorInline
                      key={comp.id}
                      competitor={comp}
                      onSave={updated => { handleCompetitorSaved(updated); setEditingDeliveryFor(null) }}
                      onClose={() => setEditingDeliveryFor(null)}
                    />
                  )
                })()}
              </div>
            )}

            {/* Quantity */}
            <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '18px 20px' }}>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📐 Quantity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <input type="range" min={1} max={maxQty} value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '6px 12px', minWidth: 50, textAlign: 'center' }}>
                  <span className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{quantity}</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Chart max qty</label>
                <input type="number" min={5} max={200} value={maxQty} onChange={e => setMaxQty(Math.max(5, parseInt(e.target.value) || 30))} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!canSimulate ? (
              <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Select a product, tick at least one competitor, and enter your unit price to start
              </div>
            ) : (
              <>
                {/* Cards: you + each rival */}
                <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(selectedRivals.length + 1, 3)}, 1fr)`, gap: 12 }}>

                  {/* Your card */}
                  {(() => {
                    const myT = myTotals!
                    const isCheapestOverall = selectedRivals.every(r => myT.total <= calcTotal(r.price, quantity, r.delivery, r.threshold).total)
                    return (
                      <div style={{ background: 'var(--surface)', border: `2px solid ${isCheapestOverall ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`, borderRadius: 13, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {ownCompetitorOnProduct && <span style={{ fontSize: 14 }}>🏠</span>}
                            <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{ownCompetitorOnProduct?.name ?? 'You'}</div>
                          </div>
                          {isCheapestOverall && <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.25)', padding: '2px 7px', borderRadius: 10 }}>CHEAPEST ✓</span>}
                        </div>
                        <div className="font-mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-1px', marginBottom: 8 }}>£{myT.total.toFixed(2)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{quantity} × £{myPriceNum!.toFixed(2)}</span>
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text)' }}>£{myT.subtotal.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Delivery</span>
                            <span className="font-mono" style={{ fontSize: 10, color: myT.delivery === 0 ? 'var(--accent)' : 'var(--text)' }}>{myT.delivery === 0 ? 'FREE' : `£${myT.delivery.toFixed(2)}`}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Rival cards */}
                  {selectedRivals.map(r => {
                    const rT      = calcTotal(r.price, quantity, r.delivery, r.threshold)
                    const isCheap = rT.total < myTotals!.total && selectedRivals.filter(o => o.cpId !== r.cpId).every(o => rT.total <= calcTotal(o.price, quantity, o.delivery, o.threshold).total)
                    const diff    = myTotals!.total - rT.total
                    const cross   = crossoverQty(myPriceNum!, myDelNum, myThreshNum, r.price, r.delivery, r.threshold, maxQty)
                    return (
                      <div key={r.cpId} style={{ background: 'var(--surface)', border: `2px solid ${isCheap ? `${r.colour.fill}55` : 'var(--border)'}`, borderRadius: 13, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: r.colour.fill, flexShrink: 0 }} />
                            <div className="font-display" style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.comp.name}</div>
                          </div>
                          {isCheap && <span className="font-mono" style={{ fontSize: 9, background: `${r.colour.fill}22`, color: r.colour.label, border: `1px solid ${r.colour.fill}44`, padding: '2px 7px', borderRadius: 10 }}>CHEAPER</span>}
                        </div>
                        <div className="font-mono" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-1px', marginBottom: 8, color: r.colour.label }}>£{rT.total.toFixed(2)}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{quantity} × £{r.price.toFixed(2)}</span>
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text)' }}>£{rT.subtotal.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Delivery</span>
                            <span className="font-mono" style={{ fontSize: 10, color: rT.delivery === 0 ? 'var(--accent)' : 'var(--text)' }}>{rT.delivery === 0 ? 'FREE' : r.delivery !== null ? `£${rT.delivery.toFixed(2)}` : 'unknown'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                            <span className="font-mono" style={{ fontSize: 10, color: diff > 0 ? 'var(--accent)' : 'var(--red)' }}>
                              {diff > 0 ? `You save £${diff.toFixed(2)}` : `You're £${Math.abs(diff).toFixed(2)} more`}
                            </span>
                            {cross && <span className="font-mono" style={{ fontSize: 10, color: 'var(--amber)' }}>✦ Q{cross}</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Chart */}
                <div className="animate-fade-up delay-100" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 13 }}>Landed Cost by Quantity</div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>dashed = qty {quantity} · ✦ = crossover</div>
                  </div>
                  <CostChart
                    myPrice={myPriceNum!}
                    myLabel={ownCompetitorOnProduct?.name ?? 'You'}
                    myDelivery={myDelNum}
                    myThreshold={myThreshNum}
                    rivals={selectedRivals.map(r => ({ name: r.comp.name, price: r.price, delivery: r.delivery, threshold: r.threshold, colour: r.colour }))}
                    maxQty={maxQty}
                    currentQty={quantity}
                  />
                </div>

                {/* Breakdown table */}
                <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 13 }}>Quantity Breakdown</div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Qty</th>
                          <th style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--accent)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{ownCompetitorOnProduct?.name ?? 'You'}</th>
                          {selectedRivals.map(r => (
                            <th key={r.cpId} style={{ padding: '8px 14px', textAlign: 'right', color: r.colour.label, fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{r.comp.name}</th>
                          ))}
                          <th style={{ padding: '8px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Winner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.min(maxQty, 20) }, (_, i) => i + 1).map(q => {
                          const myT    = calcTotal(myPriceNum!, q, myDelNum, myThreshNum)
                          const rTots  = selectedRivals.map(r => calcTotal(r.price, q, r.delivery, r.threshold))
                          const allTots = [myT.total, ...rTots.map(t => t.total)]
                          const minTot  = Math.min(...allTots)
                          const isCur   = q === quantity
                          const isCross = selectedRivals.some(r => crossoverQty(myPriceNum!, myDelNum, myThreshNum, r.price, r.delivery, r.threshold, maxQty) === q)
                          const winnerIdx = allTots.indexOf(minTot)
                          const winnerName = winnerIdx === 0 ? (ownCompetitorOnProduct?.name ?? 'You') : selectedRivals[winnerIdx - 1].comp.name
                          const winnerColour = winnerIdx === 0 ? 'var(--accent)' : selectedRivals[winnerIdx - 1].colour.label
                          return (
                            <tr key={q} style={{ borderBottom: '1px solid var(--border)', background: isCur ? 'rgba(0,229,160,0.04)' : isCross ? 'rgba(255,184,63,0.04)' : 'transparent' }}>
                              <td style={{ padding: '6px 14px', color: isCur ? 'var(--accent)' : isCross ? 'var(--amber)' : 'var(--text)' }}>
                                {q}{isCur ? ' ←' : isCross ? ' ✦' : ''}
                              </td>
                              <td style={{ padding: '6px 14px', textAlign: 'right', color: 'var(--accent)', fontWeight: myT.total === minTot ? 700 : 400 }}>£{myT.total.toFixed(2)}</td>
                              {rTots.map((rT, i) => (
                                <td key={i} style={{ padding: '6px 14px', textAlign: 'right', color: selectedRivals[i].colour.label, fontWeight: rT.total === minTot ? 700 : 400 }}>£{rT.total.toFixed(2)}</td>
                              ))}
                              <td style={{ padding: '6px 14px', textAlign: 'right', color: winnerColour, fontWeight: 600 }}>{winnerName}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {maxQty > 20 && (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                      <span className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Showing first 20 rows — see chart for full range</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inline delivery editor ─────────────────────────────────────────────────

function DeliveryEditorInline({ competitor, onSave, onClose }: {
  competitor: Competitor
  onSave: (updated: Competitor) => void
  onClose: () => void
}) {
  const [delivery, setDelivery]   = useState(competitor.delivery_cost?.toString() ?? '')
  const [threshold, setThreshold] = useState(competitor.free_delivery_threshold?.toString() ?? '')
  const [saving, setSaving]       = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch('/api/competitors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: competitor.id, delivery_cost: delivery ? parseFloat(delivery) : null, free_delivery_threshold: threshold ? parseFloat(threshold) : null }),
    })
    onSave(await res.json())
    setSaving(false)
  }

  const inp = (val: string, set: (v: string) => void, ph: string) => (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'DM Mono, monospace' }}>£</span>
      <input type="number" step="0.01" min="0" value={val} onChange={e => set(e.target.value)} placeholder={ph} style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 6, padding: '6px 8px 6px 20px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
    </div>
  )

  return (
    <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600 }}>{competitor.name} delivery</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <div>
          <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Delivery Cost</div>
          {inp(delivery, setDelivery, '0.00')}
        </div>
        <div>
          <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Free Over</div>
          {inp(threshold, setThreshold, '50.00')}
        </div>
        <button onClick={save} disabled={saving} style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--accent)', color: '#060810', fontWeight: 700, fontSize: 11, border: 'none', cursor: 'pointer' }}>
          {saving ? '...' : '✓'}
        </button>
      </div>
    </div>
  )
}
