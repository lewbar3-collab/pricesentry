'use client'

import { useState } from 'react'

interface Product {
  id: string
  name: string
  url: string
  competitor_id: string
  competitor?: {
    id: string
    scrape_method: string
    price_selector: string | null
    check_frequency_hours: number
    notes: string | null
  }
}

interface TestResult {
  price: number | null
  error: string | null
  duration_ms: number
  method: string
}

interface AdminConfigurePanelProps {
  product: Product | null
}

export default function AdminConfigurePanel({ product }: AdminConfigurePanelProps) {
  const [method, setMethod] = useState<'fetch' | 'playwright' | 'proxy'>(
    (product?.competitor?.scrape_method as 'fetch' | 'playwright' | 'proxy') ?? 'fetch'
  )
  const [selector, setSelector] = useState(product?.competitor?.price_selector ?? '')
  const [frequency, setFrequency] = useState(product?.competitor?.check_frequency_hours ?? 6)
  const [notes, setNotes] = useState(product?.competitor?.notes ?? '')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleTest() {
    if (!product || !selector) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/scrape/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: product.url, selector }),
      })
      const result = await res.json()
      setTestResult(result)
    } catch {
      setTestResult({ price: null, error: 'Request failed', duration_ms: 0, method })
    } finally {
      setTesting(false)
    }
  }

  async function handleGoLive() {
    if (!product) return
    setSaving(true)
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competitor_id: product.competitor_id,
        product_id: product.id,
        scrape_method: method,
        price_selector: selector,
        check_frequency_hours: frequency,
        notes,
        go_live: true,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => window.location.reload(), 1000)
  }

  const confidence = testResult?.price
    ? Math.min(95, 70 + (testResult.duration_ms < 500 ? 20 : testResult.duration_ms < 2000 ? 10 : 0) + (selector.includes('.') ? 5 : 0))
    : 0

  if (!product) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
        No products pending setup
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 13, overflow: 'hidden', boxShadow: '0 0 40px rgba(167,139,250,0.05)' }}>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(167,139,250,0.06), transparent)' }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>⚙ Configure Scraper</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{product.name}</div>
      </div>

      <div style={{ padding: '18px 20px' }}>

        {/* URL preview */}
        <div className="font-mono" style={{ background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px', fontSize: 10.5, color: 'var(--text-dim)', wordBreak: 'break-all', marginBottom: 16, lineHeight: 1.5 }}>
          🌐 {product.url}
        </div>

        {/* Method toggle */}
        <div style={{ marginBottom: 14 }}>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Scrape Method</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['fetch', 'playwright', 'proxy'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{ flex: 1, padding: 8, borderRadius: 7, border: `1px solid ${method === m ? 'rgba(167,139,250,0.3)' : 'var(--border-bright)'}`, background: method === m ? 'var(--purple-dim)' : 'transparent', color: method === m ? 'var(--purple)' : 'var(--text-dim)', fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                {m === 'fetch' ? '⚡ Fetch' : m === 'playwright' ? '🎭 Playwright' : '🔒 Proxy'}
              </button>
            ))}
          </div>
        </div>

        {/* Selector */}
        <div style={{ marginBottom: 14 }}>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Price CSS Selector</div>
          <input
            value={selector}
            onChange={e => setSelector(e.target.value)}
            placeholder=".price span, #product-price, .woocommerce-Price-amount"
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none' }}
          />
        </div>

        {/* Frequency */}
        <div style={{ marginBottom: 14 }}>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Check Frequency</div>
          <select
            value={frequency}
            onChange={e => setFrequency(Number(e.target.value))}
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', appearance: 'none' }}
          >
            <option value={1}>Every 1 hour</option>
            <option value={4}>Every 4 hours</option>
            <option value={6}>Every 6 hours</option>
            <option value={12}>Every 12 hours</option>
            <option value={24}>Every 24 hours</option>
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 14 }}>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Notes (optional)</div>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. WooCommerce site, price incl. VAT..."
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none' }}
          />
        </div>

        {/* Test result */}
        {testResult && (
          <div style={{ background: 'var(--bg)', border: `1px solid ${testResult.price ? 'rgba(0,229,160,0.2)' : 'rgba(255,77,106,0.2)'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
            {testResult.price ? (
              <>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 26, color: 'var(--accent)', letterSpacing: '-1px' }}>£{testResult.price.toFixed(2)}</div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Extracted in {testResult.duration_ms}ms · {method}
                </div>
                <div style={{ marginTop: 10, height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${confidence}%` }} />
                </div>
                <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                  <span>Confidence</span>
                  <span style={{ color: 'var(--accent)' }}>{confidence}% ✓</span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--red)', fontSize: 12.5 }}>
                ✗ {testResult.error ?? 'Price not found — check your selector'}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleTest}
            disabled={testing || !selector}
            style={{ flex: 1, padding: '9px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 13, border: '1px solid var(--border-bright)', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {testing ? '⏳ Testing...' : '🔄 Test Scrape'}
          </button>
          <button
            onClick={handleGoLive}
            disabled={saving || !selector || saved}
            style={{ flex: 1.5, padding: '9px', borderRadius: 7, background: saved ? 'rgba(0,229,160,0.6)' : 'var(--accent)', color: '#060810', fontWeight: 600, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {saved ? '✓ Going live...' : saving ? 'Saving...' : '✓ Go Live'}
          </button>
        </div>
      </div>
    </div>
  )
}
