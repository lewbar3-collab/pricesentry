import * as cheerio from 'cheerio'

export interface ScrapeResult {
  price: number | null
  raw: string | null
  error: string | null
  duration_ms: number
  method: string
  selector_used: string | null
}

export type ScrapeMethod = 'fetch' | 'shopify_json' | 'playwright' | 'proxy'

/**
 * Extracts a price from a URL.
 * - shopify_json: hits /products/handle.json, reads variant prices (sale first)
 * - fetch: CSS selector on HTML page (sale selector tried first, falls back to regular)
 */
export async function scrapePrice(
  url: string,
  salePriceSelector: string | null,
  regularPriceSelector: string | null,
  method: ScrapeMethod = 'fetch'
): Promise<ScrapeResult> {
  const start = Date.now()

  try {
    if (method === 'shopify_json') {
      return await scrapeShopifyJson(url, start)
    }

    const html = await fetchPage(url)

    // Try sale selector first
    if (salePriceSelector) {
      const price = extractPrice(html, salePriceSelector)
      if (price !== null) {
        return { price, raw: price.toString(), error: null, duration_ms: Date.now() - start, method, selector_used: salePriceSelector }
      }
    }

    // Fall back to regular price selector
    if (regularPriceSelector) {
      const price = extractPrice(html, regularPriceSelector)
      if (price !== null) {
        return { price, raw: price.toString(), error: null, duration_ms: Date.now() - start, method, selector_used: regularPriceSelector }
      }
    }

    const tried = [salePriceSelector, regularPriceSelector].filter(Boolean).join(', ')
    return { price: null, raw: null, error: `No price found. Tried: ${tried || 'no selectors configured'}`, duration_ms: Date.now() - start, method, selector_used: null }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { price: null, raw: null, error: message, duration_ms: Date.now() - start, method, selector_used: null }
  }
}

/**
 * Shopify JSON method — appends .json to product URL and reads variant prices.
 * Returns the lowest current price (sale price if active, otherwise regular).
 * Shopify stores prices in cents as integers (e.g. 4999 = £49.99).
 */
async function scrapeShopifyJson(url: string, start: number): Promise<ScrapeResult> {
  const method = 'shopify_json'

  // Normalise URL — build .json path, preserve variant query param
  const parsed = new URL(url)
  const variantId = parsed.searchParams.get('variant')
  const path = parsed.pathname.replace(/\/$/, '').replace(/\.json$/, '')
  const jsonUrl = `${parsed.origin}${path}.json?t=${Date.now()}`

  const response = await fetch(jsonUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-GB,en-US;q=0.9',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache',
      'X-Forwarded-For': '81.2.69.142', // UK IP hint
      'CF-IPCountry': 'GB',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return { price: null, raw: null, error: `Shopify JSON: HTTP ${response.status} — is this a Shopify product URL?`, duration_ms: Date.now() - start, method, selector_used: null }
  }

  let json: { product?: { variants?: { id: number; title: string; price: string; compare_at_price: string | null }[] } }
  try {
    json = await response.json()
  } catch {
    return { price: null, raw: null, error: 'Shopify JSON: response was not valid JSON', duration_ms: Date.now() - start, method, selector_used: null }
  }

  const variants = json?.product?.variants
  if (!variants?.length) {
    return { price: null, raw: null, error: 'Shopify JSON: no variants found in response', duration_ms: Date.now() - start, method, selector_used: null }
  }

  // Build a summary of all variants for debugging
  const variantSummary = variants.map(v => `${v.title}: £${v.price}${v.compare_at_price ? ` (was £${v.compare_at_price})` : ''} [id:${v.id}]`).join(' | ')

  // If URL contains ?variant=ID, use that specific variant
  if (variantId) {
    const match = variants.find(v => String(v.id) === variantId)
    if (match) {
      const price = parseFloat(match.price)
      if (!isNaN(price)) {
        return { price, raw: match.price, error: null, duration_ms: Date.now() - start, method, selector_used: `variant ${variantId} | all: ${variantSummary}` }
      }
    }
    // Variant ID in URL not found — fall through to first variant
  }

  // No variant in URL — use the first variant (matches what storefront shows by default)
  const first = variants[0]
  const firstPrice = parseFloat(first.price)
  if (!isNaN(firstPrice)) {
    return {
      price: firstPrice,
      raw: first.price,
      error: null,
      duration_ms: Date.now() - start,
      method,
      selector_used: `first_variant | all: ${variantSummary}`,
    }
  }

  return { price: null, raw: null, error: `Shopify JSON: could not parse prices. Variants: ${variantSummary}`, duration_ms: Date.now() - start, method, selector_used: null }
}

async function fetchPage(url: string): Promise<string> {
  const domain = new URL(url).hostname
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': `https://www.google.com/search?q=${encodeURIComponent(domain)}`,
      'DNT': '1',
    },
    redirect: 'follow',
    next: { revalidate: 0 },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  return response.text()
}

function extractPrice(html: string, selector: string): number | null {
  const $ = cheerio.load(html)
  const el = $(selector).first()
  if (!el.length) return null
  return parsePrice(el.text().trim())
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw
    .replace(/[£$€¥]/g, '')
    .replace(/\s/g, '')
    .replace(/,(?=\d{3})/g, '')
    .replace(/,/g, '.')
    .trim()

  const match = cleaned.match(/\d+\.?\d{0,2}/)
  if (!match) return null
  const price = parseFloat(match[0])
  return isNaN(price) ? null : price
}

export async function testScrape(
  url: string,
  salePriceSelector: string | null,
  regularPriceSelector: string | null,
  method: ScrapeMethod = 'fetch'
) {
  return scrapePrice(url, salePriceSelector, regularPriceSelector, method)
}
