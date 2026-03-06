import * as cheerio from 'cheerio'

export interface ScrapeResult {
  price: number | null
  raw: string | null
  error: string | null
  duration_ms: number
  method: string
}

/**
 * Extracts a price from a URL using a CSS selector.
 * Uses simple fetch first. Falls back gracefully.
 */
export async function scrapePrice(
  url: string,
  selector: string,
  method: 'fetch' | 'playwright' | 'proxy' = 'fetch'
): Promise<ScrapeResult> {
  const start = Date.now()

  try {
    const html = await fetchPage(url)
    const price = extractPrice(html, selector)

    return {
      price,
      raw: price?.toString() ?? null,
      error: price === null ? `No price found with selector: ${selector}` : null,
      duration_ms: Date.now() - start,
      method,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      price: null,
      raw: null,
      error: message,
      duration_ms: Date.now() - start,
      method,
    }
  }
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.5',
      'Cache-Control': 'no-cache',
    },
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
  // Strip currency symbols, spaces, commas
  // Handles: £45.99, $45.99, 45,99€, £1,299.00 etc
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
 * Test a selector against a URL — returns result for admin preview
 */
export async function testScrape(url: string, selector: string) {
  return scrapePrice(url, selector, 'fetch')
}
