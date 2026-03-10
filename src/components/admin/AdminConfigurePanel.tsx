'use client'

import { useState } from 'react'

interface CompetitorProduct {
  id: string
  url: string
  status: string
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
  competitor_products?: CompetitorProduct[]
  profile?: { email: string; company_name: string | null }
}

interface TestResult {
  price: number | null
  error: string | null
  duration_ms: number
  selector_used: string | null
}

interface Props {
  competitor: Competitor | null
  sampleProduct: CompetitorProduct | null
}

export default function AdminConfigurePanel({ competitor, sampleProduct }: Props) {
  const [method, setMethod] = useState<'fetch' | 'shopify_json' | 'playwright' | 'proxy'>(
    (competitor?.scrape_method as 'fetch' | 'shopify_json' | 'playwright' | 'proxy') ?? 'fetch'
  )
  const [saleSelector, setSaleSelector]   = useState(competitor?.sale_price_selector ?? '')
  const [regularSelector, setRegularSelector] = useState(competitor?.price_selector ?? '')
  const [frequency, setFrequency]         = useState(competitor?.check_frequency_hours ?? 6)
  const [notes, setNotes]                 = useState(competitor?.notes ?? '')
  const [testUrl, setTestUrl]             = useState(sampleProduct?.url ?? '')
  const [testing, setTesting]             = useState(false)
  const [testResult, setTestResult]       = useState<TestResult | null>(null)
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)

  async function handleTest() {
    if (!testUrl || (!saleSelector && !regularSelector)) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/scrape/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: testUrl,
          sale_price_selector: saleSelector || null,
          price_selector: regularSelector || null,
          method,
        }),
      })
      const result = await res.json()
      setTestResult(result)
    } catch {
      setTestResult({ price: null, error: 'Request failed', duration_ms: 0, selector_used: null })
    } finally {
      setTesting(false)
    }
  }

  async function handleGoLive() {
    if (!competitor) return
    setSaving(true)
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        competitor_id: competitor.id,
        scrape_method: method,
        sale_price_selector: saleSelector || null,
        price_selector: regularSelector || null,
        check_frequency_hours: frequency,
        notes,
        go_live: true,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => window.location.reload(), 1000)
  }

  const pendingCount = competitor?.competitor_products?.length ?? 0
  const hasSelector = method === 'shopify_json' || !!(saleSelector || regularSelector)
  const confidence = testResult?.price
    ? Math.min(95, 70 + (testResult.duration_ms < 500 ? 20 : testResult.duration_ms < 2000 ? 10 : 0) + (hasSelector ? 5 : 0))
    : 0

  if (!competitor) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>✅</div>
        No competitors pending setup
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 13, overflow: 'hidden', boxShadow: '0 0 40px rgba(167,139,250,0.05)' }}>

      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(167,139,250,0.06), transparent)' }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>⚙ Configure Scraper</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 2 }}>{competitor.name} · <span className="font-mono" style={{ fontSize: 11 }}>{competitor.domain}</span></div>
        <div className="font-mono" style={{ fontSize: 10, color: 'var(--amber)' }}>
          {pendingCount} product{pendingCount !== 1 ? 's' : ''} will go live when configured
        </div>
      </div>

      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Products list */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 12px' }}>
          <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Products in this batch</div>
          {competitor.competitor_products?.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
              <div style={{ fontSize: 11.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>{p.url}</div>
            </div>
          ))}
        </div>

        {/* Test URL */}
        <div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Test URL</div>
          <input
            value={testUrl}
            onChange={e => setTestUrl(e.target.value)}
            placeholder="Paste a product URL to test..."
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Method */}
        <div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Scrape Method</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['fetch', 'shopify_json', 'playwright', 'proxy'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                style={{ flex: 1, padding: 8, borderRadius: 7, border: `1px solid ${method === m ? 'rgba(167,139,250,0.3)' : 'var(--border-bright)'}`, background: method === m ? 'var(--purple-dim)' : 'transparent', color: method === m ? 'var(--purple)' : 'var(--text-dim)', fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                {m === 'fetch' ? '⚡ Fetch' : m === 'shopify_json' ? '🛍 Shopify' : m === 'playwright' ? '🎭 JS' : '🔒 Proxy'}
              </button>
            ))}
          </div>
        </div>

        {/* Shopify JSON note — selectors not needed */}
        {method === 'shopify_json' && (
          <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--purple)', marginBottom: 4 }}>🛍 Shopify JSON mode</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Appends <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>.json</code> to each product URL and reads the variant price directly — no CSS selectors needed. Works on any standard Shopify store.
            </div>
          </div>
        )}

        {/* Sale price selector */}
        <div style={{ opacity: method === 'shopify_json' ? 0.35 : 1, pointerEvents: method === 'shopify_json' ? 'none' : 'auto', transition: 'opacity 0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Sale Price Selector</div>
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,229,160,0.1)', color: 'var(--accent)', border: '1px solid rgba(0,229,160,0.2)', fontFamily: 'DM Mono, monospace' }}>tried first</span>
          </div>
          <input
            value={saleSelector}
            onChange={e => setSaleSelector(e.target.value)}
            placeholder=".price ins .woocommerce-Price-amount, .sale-price"
            style={{ width: '100%', background: 'var(--bg)', border: `1px solid ${saleSelector ? 'rgba(0,229,160,0.25)' : 'var(--border-bright)'}`, borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          />
        </div>

        {/* Regular price selector */}
        <div style={{ opacity: method === 'shopify_json' ? 0.35 : 1, pointerEvents: method === 'shopify_json' ? 'none' : 'auto', transition: 'opacity 0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Regular Price Selector</div>
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(140,149,168,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'DM Mono, monospace' }}>fallback</span>
          </div>
          <input
            value={regularSelector}
            onChange={e => setRegularSelector(e.target.value)}
            placeholder=".price .woocommerce-Price-amount, .regular-price"
            style={{ width: '100%', background: 'var(--bg)', border: `1px solid ${regularSelector ? 'rgba(140,149,168,0.25)' : 'var(--border-bright)'}`, borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          />
          <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 5 }}>
            If the item is not on sale the sale selector will return nothing — the regular selector is used as fallback.
          </div>
        </div>

        {/* Frequency */}
        <div>
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
        <div>
          <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Notes (optional)</div>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. WooCommerce, prices inc. VAT..."
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border-bright)', borderRadius: 7, padding: '9px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Test result */}
        {testResult && (
          <div style={{ background: 'var(--bg)', border: `1px solid ${testResult.price ? 'rgba(0,229,160,0.2)' : 'rgba(255,77,106,0.2)'}`, borderRadius: 8, padding: '12px 14px' }}>
            {testResult.price ? (
              <>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 26, color: 'var(--accent)', letterSpacing: '-1px' }}>£{testResult.price.toFixed(2)}</div>
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                  Extracted in {testResult.duration_ms}ms · {method}
                  {testResult.selector_used && (
                    <span style={{ marginLeft: 8, color: testResult.selector_used === saleSelector ? 'var(--accent)' : 'var(--text-muted)' }}>
                      · used {testResult.selector_used === saleSelector ? 'sale' : 'regular'} selector
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 10, height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 2, width: `${confidence}%`, transition: 'width 0.5s' }} />
                </div>
                <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: 'var(--text-muted)' }}>
                  <span>Confidence</span>
                  <span style={{ color: 'var(--accent)' }}>{confidence}% ✓</span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--red)', fontSize: 12.5 }}>
                ✗ {testResult.error ?? 'Price not found — check your selectors'}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleTest}
            disabled={testing || !hasSelector || !testUrl}
            style={{ flex: 1, padding: '9px', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-dim)', fontSize: 13, border: '1px solid var(--border-bright)', cursor: 'pointer', transition: 'all 0.15s', opacity: (!hasSelector || !testUrl) ? 0.5 : 1 }}
          >
            {testing ? '⏳ Testing...' : '🔄 Test Scrape'}
          </button>
          <button
            onClick={handleGoLive}
            disabled={saving || !hasSelector || saved}
            style={{ flex: 1.5, padding: '9px', borderRadius: 7, background: saved ? 'rgba(0,229,160,0.6)' : 'var(--accent)', color: '#060810', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', transition: 'all 0.15s', opacity: !hasSelector ? 0.5 : 1 }}
          >
            {saved ? `✓ ${pendingCount} products going live...` : saving ? 'Activating...' : `✓ Activate ${pendingCount} Products`}
          </button>
        </div>
      </div>
    </div>
  )
}
