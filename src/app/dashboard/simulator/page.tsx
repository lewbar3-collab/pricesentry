'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Product, Competitor, CompetitorProduct } from '@/types'

type FullProduct = Product & {
  competitor_products?: (CompetitorProduct & { competitor?: Competitor })[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calcTotal(unitPrice: number, qty: number, deliveryCost: number | null, freeThreshold: number | null): {
  subtotal: number
  delivery: number
  total: number
} {
  const subtotal = unitPrice * qty
  const delivery = freeThreshold !== null && subtotal >= freeThreshold
    ? 0
    : (deliveryCost ?? 0)
  return { subtotal, delivery, total: subtotal + delivery }
}

function crossoverQty(
  myPrice: number, myDelivery: number | null, myThreshold: number | null,
  theirPrice: number, theirDelivery: number | null, theirThreshold: number | null,
  maxQty: number
): number | null {
  for (let q = 1; q <= maxQty; q++) {
    const mine = calcTotal(myPrice, q, myDelivery, myThreshold)
    const theirs = calcTotal(theirPrice, q, theirDelivery, theirThreshold)
    if (mine.total <= theirs.total) return q
  }
  return null
}

// ── Sub-components ─────────────────────────────────────────────────────────

function DeliveryEditor({ competitor, onSave }: {
  competitor: Competitor
  onSave: (updated: Competitor) => void
}) {
  const [delivery, setDelivery] = useState(competitor.delivery_cost?.toString() ?? '')
  const [threshold, setThreshold] = useState(competitor.free_delivery_threshold?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch('/api/competitors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: competitor.id,
        delivery_cost: delivery ? parseFloat(delivery) : null,
        free_delivery_threshold: threshold ? parseFloat(threshold) : null,
      }),
    })
    const data = await res.json()
    onSave(data)
    setSaving(false)
  }

  const inp = (val: string, set: (v: string) => void, placeholder: string) => (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'DM Mono, monospace' }}>£</span>
      <input
        type="number" step="0.01" min="0"
        value={val} onChange={e => set(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '7px 10px 7px 22px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
      />
    </div>
  )

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#4d9fff,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, color: '#fff' }}>
          {competitor.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{competitor.name}</div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{competitor.domain}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div>
          <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Delivery Cost</div>
          {inp(delivery, setDelivery, '0.00')}
        </div>
        <div>
          <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Free Delivery Over</div>
          {inp(threshold, setThreshold, 'e.g. 50.00')}
        </div>
      </div>
      <button onClick={save} disabled={saving} style={{ width: '100%', padding: '7px', borderRadius: 7, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(0,229,160,0.25)', cursor: 'pointer' }}>
        {saving ? 'Saving...' : 'Save Delivery Settings'}
      </button>
    </div>
  )
}

// ── Sparkline chart ────────────────────────────────────────────────────────

function CostChart({
  myPrice, myLabel, myDelivery, myThreshold,
  theirPrice, theirLabel, theirDelivery, theirThreshold,
  maxQty, currentQty,
}: {
  myPrice: number; myLabel: string; myDelivery: number | null; myThreshold: number | null
  theirPrice: number; theirLabel: string; theirDelivery: number | null; theirThreshold: number | null
  maxQty: number; currentQty: number
}) {
  const W = 600; const H = 220; const PAD = { top: 16, right: 16, bottom: 36, left: 58 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const points = Array.from({ length: maxQty }, (_, i) => i + 1).map(q => ({
    q,
    mine: calcTotal(myPrice, q, myDelivery, myThreshold).total,
    theirs: calcTotal(theirPrice, q, theirDelivery, theirThreshold).total,
  }))

  const maxVal = Math.max(...points.map(p => Math.max(p.mine, p.theirs)))
  const minVal = 0

  const xScale = (q: number) => PAD.left + ((q - 1) / (maxQty - 1)) * chartW
  const yScale = (v: number) => PAD.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH

  const pathD = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i + 1).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ')

  const myPath = pathD(points.map(p => p.mine))
  const theirPath = pathD(points.map(p => p.theirs))

  // Current qty vertical line
  const curX = xScale(currentQty)

  // Crossover point
  const cross = crossoverQty(myPrice, myDelivery, myThreshold, theirPrice, theirDelivery, theirThreshold, maxQty)
  const crossX = cross ? xScale(cross) : null
  const crossY = cross ? yScale(calcTotal(myPrice, cross, myDelivery, myThreshold).total) : null

  // X axis ticks
  const tickCount = Math.min(maxQty, 10)
  const tickStep = Math.ceil(maxQty / tickCount)
  const ticks = Array.from({ length: Math.floor(maxQty / tickStep) + 1 }, (_, i) => Math.min(i * tickStep + 1, maxQty))

  // Y axis ticks
  const yTickCount = 5
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => Math.round((maxVal / yTickCount) * i))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* Grid lines */}
      {yTicks.map(v => (
        <line key={v} x1={PAD.left} x2={W - PAD.right} y1={yScale(v)} y2={yScale(v)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      ))}

      {/* Y axis labels */}
      {yTicks.map(v => (
        <text key={v} x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="DM Mono, monospace">£{v}</text>
      ))}

      {/* X axis labels */}
      {ticks.map(q => (
        <text key={q} x={xScale(q)} y={H - PAD.bottom + 16} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="DM Mono, monospace">{q}</text>
      ))}
      <text x={PAD.left + chartW / 2} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={9} fontFamily="DM Mono, monospace">Quantity (panels)</text>

      {/* Their line */}
      <path d={theirPath} fill="none" stroke="rgba(167,139,250,0.7)" strokeWidth={2} strokeLinejoin="round" />

      {/* My line */}
      <path d={myPath} fill="none" stroke="rgba(0,229,160,0.9)" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Crossover marker */}
      {crossX !== null && crossY !== null && (
        <>
          <line x1={crossX} x2={crossX} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(255,184,63,0.4)" strokeWidth={1} strokeDasharray="3,3" />
          <circle cx={crossX} cy={crossY} r={5} fill="var(--amber)" />
          <text x={crossX + 7} y={crossY - 6} fill="var(--amber)" fontSize={9} fontFamily="DM Mono, monospace">Q{cross} crossover</text>
        </>
      )}

      {/* Current qty line */}
      <line x1={curX} x2={curX} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.2)" strokeWidth={1} strokeDasharray="4,3" />

      {/* Legend */}
      <circle cx={PAD.left + 8} cy={PAD.top + 8} r={4} fill="rgba(0,229,160,0.9)" />
      <text x={PAD.left + 16} y={PAD.top + 12} fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="DM Mono, monospace">{myLabel}</text>
      <circle cx={PAD.left + 100} cy={PAD.top + 8} r={4} fill="rgba(167,139,250,0.7)" />
      <text x={PAD.left + 108} y={PAD.top + 12} fill="rgba(255,255,255,0.6)" fontSize={9} fontFamily="DM Mono, monospace">{theirLabel}</text>
    </svg>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [products, setProducts]       = useState<FullProduct[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading]         = useState(true)

  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedCpId, setSelectedCpId]           = useState<string>('')
  const [myUnitPrice, setMyUnitPrice]             = useState<string>('')
  const [myDelivery, setMyDelivery]               = useState<string>('')
  const [myThreshold, setMyThreshold]             = useState<string>('')
  const [quantity, setQuantity]                   = useState(5)
  const [maxQty, setMaxQty]                       = useState(30)
  const [showDeliveryEditor, setShowDeliveryEditor] = useState(false)
  const [showMyDeliveryEditor, setShowMyDeliveryEditor] = useState(false)

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

  // Own company cp on this product (if tracked)
  const ownCp = selectedProduct?.competitor_products?.find(cp => {
    const comp = competitors.find(c => c.id === cp.competitor_id)
    return comp?.is_own_company && cp.last_price
  })
  const ownCompetitorOnProduct = ownCp ? competitors.find(c => c.id === ownCp.competitor_id) : null
  const hasOwnCpOnProduct = !!ownCp

  // Competitor options = only non-own-company entries with a price
  const competitorOptions = (selectedProduct?.competitor_products ?? []).filter(cp => {
    const comp = competitors.find(c => c.id === cp.competitor_id)
    return cp.last_price && !comp?.is_own_company
  })
  const selectedCp = competitorOptions.find(cp => cp.id === selectedCpId)
  const selectedCompetitor = competitors.find(c => c.id === selectedCp?.competitor_id)
  const ownCompetitor = competitors.find(c => c.is_own_company)

  // Auto-select first product when loaded
  useEffect(() => {
    if (products.length && !selectedProductId) {
      const first = products.find(p => p.competitor_products?.some(cp => cp.last_price))
      if (first) setSelectedProductId(first.id)
    }
  }, [products])

  // When product changes: reset cp selection + auto-fill own pricing if available
  useEffect(() => {
    if (!selectedProduct) return
    // Pick first non-own competitor with a price
    const firstRival = selectedProduct.competitor_products?.find(cp => {
      const comp = competitors.find(c => c.id === cp.competitor_id)
      return cp.last_price && !comp?.is_own_company
    })
    setSelectedCpId(firstRival?.id ?? '')

    // If own company is tracked on this product, auto-fill "Your Pricing"
    const ownEntry = selectedProduct.competitor_products?.find(cp => {
      const comp = competitors.find(c => c.id === cp.competitor_id)
      return comp?.is_own_company && cp.last_price
    })
    if (ownEntry) {
      const ownComp = competitors.find(c => c.id === ownEntry.competitor_id)
      setMyUnitPrice(String(ownEntry.last_price ?? ''))
      setMyDelivery(ownComp?.delivery_cost?.toString() ?? '')
      setMyThreshold(ownComp?.free_delivery_threshold?.toString() ?? '')
    } else {
      setMyUnitPrice('')
      setMyDelivery('')
      setMyThreshold('')
    }
  }, [selectedProductId])

  const handleCompetitorSaved = useCallback((updated: Competitor) => {
    setCompetitors(prev => prev.map(c => c.id === updated.id ? updated : c))
  }, [])

  // Derived values
  const theirUnitPrice = selectedCp?.last_price ?? null
  const myPriceNum     = myUnitPrice ? parseFloat(myUnitPrice) : null
  const myDelNum       = myDelivery ? parseFloat(myDelivery) : null
  const myThreshNum    = myThreshold ? parseFloat(myThreshold) : null
  const theirDelNum    = selectedCompetitor?.delivery_cost ?? null
  const theirThreshNum = selectedCompetitor?.free_delivery_threshold ?? null

  const canSimulate = myPriceNum !== null && theirUnitPrice !== null

  const myTotals   = canSimulate ? calcTotal(myPriceNum!, quantity, myDelNum, myThreshNum) : null
  const theirTotals = canSimulate && theirUnitPrice ? calcTotal(theirUnitPrice, quantity, theirDelNum, theirThreshNum) : null

  const diff = myTotals && theirTotals ? theirTotals.total - myTotals.total : null
  const cheaper = diff !== null ? diff > 0 ? 'you' : diff < 0 ? 'them' : 'same' : null

  const cross = canSimulate && theirUnitPrice
    ? crossoverQty(myPriceNum!, myDelNum, myThreshNum, theirUnitPrice, theirDelNum, theirThreshNum, maxQty)
    : null

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

          {/* ── Left panel: inputs ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Product + competitor select */}
            <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '18px 20px' }}>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📦 Select Product</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Your Product</label>
                  <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                    <option value="">— choose a product —</option>
                    {products.filter(p => p.competitor_products?.some(cp => cp.last_price)).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Compare Against</label>
                  <select value={selectedCpId} onChange={e => setSelectedCpId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }} disabled={!selectedProduct}>
                    <option value="">— choose a competitor —</option>
                    {competitorOptions.map(cp => (
                      <option key={cp.id} value={cp.id}>
                        {cp.competitor?.is_own_company ? '🏠 ' : ''}{cp.competitor?.name} — £{Number(cp.last_price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Your pricing — auto-populated if own company tracked, else manual */}
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
                    <div>
                      <label style={labelStyle}>Your Unit Price</label>
                      {poundInput(myUnitPrice, setMyUnitPrice, '0.00')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={labelStyle}>Delivery Cost</label>
                        {poundInput(myDelivery, setMyDelivery, '0.00')}
                      </div>
                      <div>
                        <label style={labelStyle}>Free Over</label>
                        {poundInput(myThreshold, setMyThreshold, 'e.g. 50')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                      <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Unit Price</div>
                      <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                        {myUnitPrice ? `£${parseFloat(myUnitPrice).toFixed(2)}` : '—'}
                      </div>
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
                  <div>
                    <label style={labelStyle}>Your Unit Price</label>
                    {poundInput(myUnitPrice, setMyUnitPrice, '0.00')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={labelStyle}>Delivery Cost</label>
                      {poundInput(myDelivery, setMyDelivery, '0.00')}
                    </div>
                    <div>
                      <label style={labelStyle}>Free Over</label>
                      {poundInput(myThreshold, setMyThreshold, 'e.g. 50')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Competitor delivery */}
            {selectedCompetitor && (
              <div className="animate-fade-up delay-150" style={{ background: 'var(--surface)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 13, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: 'var(--purple)' }}>🏪 {selectedCompetitor.name}</div>
                  <button onClick={() => setShowDeliveryEditor(!showDeliveryEditor)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer' }}>
                    {showDeliveryEditor ? 'Close' : '✏️ Edit Delivery'}
                  </button>
                </div>

                {showDeliveryEditor ? (
                  <DeliveryEditor competitor={selectedCompetitor} onSave={(updated) => { handleCompetitorSaved(updated); setShowDeliveryEditor(false) }} />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                      <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Unit Price</div>
                      <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--purple)' }}>
                        {theirUnitPrice ? `£${Number(theirUnitPrice).toFixed(2)}` : '—'}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                      <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Delivery</div>
                      <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        {theirDelNum !== null ? `£${theirDelNum.toFixed(2)}` : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>not set</span>}
                      </div>
                      {theirThreshNum !== null && (
                        <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--accent)', marginTop: 2 }}>free over £{theirThreshNum.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity slider */}
            <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '18px 20px' }}>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>📐 Quantity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="range" min={1} max={maxQty} value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }}
                  />
                </div>
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

          {/* ── Right panel: results ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {!canSimulate ? (
              <div className="animate-fade-up" style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Select a product, competitor, and enter your unit price to start simulating
              </div>
            ) : (
              <>
                {/* Cost breakdown cards */}
                <div className="animate-fade-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

                  {/* Your total */}
                  <div style={{ background: 'var(--surface)', border: `2px solid ${cheaper === 'you' ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`, borderRadius: 13, padding: '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {ownCompetitorOnProduct && <span style={{ fontSize: 14 }}>🏠</span>}
                        <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{ownCompetitorOnProduct?.name ?? 'You'}</div>
                      </div>
                      {cheaper === 'you' && <span className="font-mono" style={{ fontSize: 10, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.25)', padding: '2px 8px', borderRadius: 10 }}>CHEAPER ✓</span>}
                    </div>
                    <div className="font-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-1px', marginBottom: 4 }}>
                      £{myTotals!.total.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{quantity} × £{myPriceNum!.toFixed(2)}</span>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text)' }}>£{myTotals!.subtotal.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delivery</span>
                        <span className="font-mono" style={{ fontSize: 11, color: myTotals!.delivery === 0 ? 'var(--accent)' : 'var(--text)' }}>
                          {myTotals!.delivery === 0 ? 'FREE' : `£${myTotals!.delivery.toFixed(2)}`}
                        </span>
                      </div>
                      {myThreshNum !== null && myTotals!.delivery > 0 && (
                        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          £{(myThreshNum - myTotals!.subtotal).toFixed(2)} more for free delivery
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Their total */}
                  <div style={{ background: 'var(--surface)', border: `2px solid ${cheaper === 'them' ? 'rgba(167,139,250,0.4)' : 'var(--border)'}`, borderRadius: 13, padding: '20px 22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="font-display" style={{ fontWeight: 700, fontSize: 13, color: selectedCompetitor?.is_own_company ? 'var(--accent)' : 'var(--purple)' }}>{selectedCompetitor?.is_own_company ? '🏠 ' : ''}{selectedCompetitor?.name ?? 'Competitor'}</div>
                        {selectedCompetitor?.is_own_company && <span className="font-mono" style={{ fontSize: 9, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.3)', padding: '1px 6px', borderRadius: 10 }}>MY COMPANY</span>}
                      </div>
                      {cheaper === 'them' && <span className="font-mono" style={{ fontSize: 10, background: 'rgba(167,139,250,0.1)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,0.25)', padding: '2px 8px', borderRadius: 10 }}>CHEAPER</span>}
                    </div>
                    <div className="font-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--purple)', letterSpacing: '-1px', marginBottom: 4 }}>
                      £{theirTotals!.total.toFixed(2)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{quantity} × £{Number(theirUnitPrice).toFixed(2)}</span>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text)' }}>£{theirTotals!.subtotal.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Delivery</span>
                        <span className="font-mono" style={{ fontSize: 11, color: theirTotals!.delivery === 0 ? 'var(--accent)' : 'var(--text)' }}>
                          {theirTotals!.delivery === 0 ? 'FREE' : theirDelNum !== null ? `£${theirTotals!.delivery.toFixed(2)}` : 'unknown'}
                        </span>
                      </div>
                      {theirThreshNum !== null && theirTotals!.delivery > 0 && (
                        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          £{(theirThreshNum - theirTotals!.subtotal).toFixed(2)} more for free delivery
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Difference callout */}
                {diff !== null && (
                  <div className="animate-fade-up delay-100" style={{ background: 'var(--surface)', border: `1px solid ${Math.abs(diff) < 1 ? 'var(--border)' : diff > 0 ? 'rgba(0,229,160,0.2)' : 'rgba(167,139,250,0.2)'}`, borderRadius: 13, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                    <div>
                      <div className="font-display" style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {cheaper === 'same' ? '⚖️ Same price' : cheaper === 'you' ? `✅ You save the customer £${Math.abs(diff).toFixed(2)}` : `❌ Customer pays £${Math.abs(diff).toFixed(2)} more with you`}
                      </div>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        at qty {quantity} · per-panel difference: £{(Math.abs(diff) / quantity).toFixed(2)}
                      </div>
                    </div>
                    {cross !== null && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="font-mono" style={{ fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Crossover point</div>
                        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--amber)' }}>Q{cross}</div>
                        <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>you're cheaper from here</div>
                      </div>
                    )}
                    {cross === null && cheaper === 'them' && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="font-mono" style={{ fontSize: 10, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>No crossover</div>
                        <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>within {maxQty} panels</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Chart */}
                <div className="animate-fade-up delay-200" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 13 }}>Landed Cost by Quantity</div>
                    <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>dashed line = current qty ({quantity})</div>
                  </div>
                  <CostChart
                    myPrice={myPriceNum!} myLabel={ownCompetitorOnProduct?.name ?? "You"} myDelivery={myDelNum} myThreshold={myThreshNum}
                    theirPrice={theirUnitPrice!} theirLabel={selectedCompetitor?.name ?? 'Competitor'} theirDelivery={theirDelNum} theirThreshold={theirThreshNum}
                    maxQty={maxQty} currentQty={quantity}
                  />
                </div>

                {/* Full breakdown table */}
                <div className="animate-fade-up delay-300" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div className="font-display" style={{ fontWeight: 700, fontSize: 13 }}>Quantity Breakdown</div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Qty', 'Your Total', 'Their Total', 'Difference', 'Winner'].map(h => (
                            <th key={h} style={{ padding: '8px 16px', textAlign: h === 'Qty' ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: Math.min(maxQty, 20) }, (_, i) => i + 1).map(q => {
                          const mine  = calcTotal(myPriceNum!, q, myDelNum, myThreshNum)
                          const theirs = calcTotal(theirUnitPrice!, q, theirDelNum, theirThreshNum)
                          const d = theirs.total - mine.total
                          const isCurrentQty = q === quantity
                          return (
                            <tr key={q} style={{ borderBottom: '1px solid var(--border)', background: isCurrentQty ? 'rgba(0,229,160,0.04)' : q === cross ? 'rgba(255,184,63,0.05)' : 'transparent' }}>
                              <td style={{ padding: '7px 16px', color: isCurrentQty ? 'var(--accent)' : q === cross ? 'var(--amber)' : 'var(--text)' }}>
                                {q}{isCurrentQty ? ' ←' : q === cross ? ' ✦' : ''}
                              </td>
                              <td style={{ padding: '7px 16px', textAlign: 'right', color: 'var(--accent)' }}>£{mine.total.toFixed(2)}</td>
                              <td style={{ padding: '7px 16px', textAlign: 'right', color: 'var(--purple)' }}>£{theirs.total.toFixed(2)}</td>
                              <td style={{ padding: '7px 16px', textAlign: 'right', color: d > 0 ? 'var(--accent)' : d < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                                {d > 0 ? '+' : ''}{d.toFixed(2)}
                              </td>
                              <td style={{ padding: '7px 16px', textAlign: 'right', color: d > 0 ? 'var(--accent)' : d < 0 ? 'var(--purple)' : 'var(--text-muted)' }}>
                                {d > 0 ? 'You' : d < 0 ? (selectedCompetitor?.name ?? 'Them') : '—'}
                              </td>
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
