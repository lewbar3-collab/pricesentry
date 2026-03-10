import * as cheerio from 'cheerio'

export interface ScrapeResult {
  price: number | null
  raw: string | null
  error: string | null
  duration_ms: number
  method: string
  selector_used: string | null
}

/**
 * Extracts a price from a URL.
 * Tries sale_price_selector first (if provided), falls back to price_selector.
 * Uses browser-like headers to avoid 403s from WooCommerce / Cloudflare.
 */
export async function scrapePrice(
  url: string,
  salePriceSelector: string | null,
  regularPriceSelector: string | null,
  method: 'fetch' | 'playwright' | 'proxy' = 'fetch'
): Promise<ScrapeResult> {
  const start = Date.now()

  try {
    const html = await fetchPage(url)

    // Try sale selector first
    if (salePriceSelector) {
      const price = extractPrice(html, salePriceSelector)
      if (price !== null) {
        return {
          price,
          raw: price.toString(),
          error: null,
          duration_ms: Date.now() - start,
          method,
          selector_used: salePriceSelector,
        }
      }
    }

    // Fall back to regular price selector
    if (regularPriceSelector) {
      const price = extractPrice(html, regularPriceSelector)
      if (price !== null) {
        return {
          price,
          raw: price.toString(),
          error: null,
          duration_ms: Date.now() - start,
          method,
          selector_used: regularPriceSelector,
        }
      }
    }

    const tried = [salePriceSelector, regularPriceSelector].filter(Boolean).join(', ')
    return {
      price: null,
      raw: null,
      error: `No price found. Tried: ${tried || 'no selectors configured'}`,
      duration_ms: Date.now() - start,
      method,
      selector_used: null,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      price: null,
      raw: null,
      error: message,
      duration_ms: Date.now() - start,
      method,
      selector_used: null,
    }
  }
}

async function fetchPage(url: string): Promise<string> {
  const domain = new URL(url).hostname

  const response = await fetch(url, {
    headers: {
      // Full browser identity — defeats most basic bot detection incl. WooCommerce/Cloudflare
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

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.text()
}

function extractPrice(html: string, selector: string): number | null {
  const $ = cheerio.load(html)
  const el = $(selector).first()
  if (!el.length) return null
  const raw = el.text().trim()
  return parsePrice(raw)
}

export function parsePrice(raw: string): number | null {
  const cleaned = raw
    .replace(/[£$€¥]/g, '')
    .replace(/\s/g, '')
    .replace(/,(?=\d{3})/g, '')   // Remove thousand separators
    .replace(/,/g, '.')            // EU decimal comma -> dot
    .trim()

  const match = cleaned.match(/\d+\.?\d{0,2}/)
  if (!match) return null

  const price = parseFloat(match[0])
  return isNaN(price) ? null : price
}

/**
 * Test a selector against a URL — used by admin scraper config panel
 */
export async function testScrape(
  url: string,
  salePriceSelector: string | null,
  regularPriceSelector: string | null
) {
  return scrapePrice(url, salePriceSelector, regularPriceSelector, 'fetch')
}
