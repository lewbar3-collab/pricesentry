import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export const maxDuration = 60 // allow up to 60s for large catalogues

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  images: { src: string }[]
  variants: { price: string }[]
}

function normaliseOrigin(raw: string): string {
  const withScheme = raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`
  return new URL(withScheme).origin
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceSentry/1.0)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function scrapeShopifyProducts(storeUrl: string): Promise<ShopifyProduct[]> {
  const origin = normaliseOrigin(storeUrl)
  const all: ShopifyProduct[] = []

  for (let page = 1; page <= 20; page++) {
    const endpoint = `${origin}/products.json?limit=250&page=${page}`
    let res: Response

    try {
      res = await fetchWithTimeout(endpoint, 20000)
    } catch (err: unknown) {
      // Timeout or DNS failure on page 1 = real error, later pages = just stop
      if (page === 1) throw new Error(`Could not reach ${origin} — check the URL is correct and the store is live`)
      break
    }

    if (!res.ok) {
      if (page === 1) throw new Error(`Store returned ${res.status} — is this a Shopify store?`)
      break
    }

    let json: { products?: ShopifyProduct[] }
    try {
      json = await res.json()
    } catch {
      if (page === 1) throw new Error('Store did not return valid JSON — not a Shopify store?')
      break
    }

    const products = json.products ?? []
    if (products.length === 0) break

    all.push(...products)
    if (products.length < 250) break
  }

  return all
}

// POST /api/catalogue/scrape
export async function POST(req: NextRequest) {
  try {
    const profile  = await requireClient()
    const supabase = await createAdminClient()
    const ownerId  = profile.ownerId ?? profile.id

    let body: { competitor_id?: string; store_url?: string }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { competitor_id, store_url } = body
    if (!competitor_id || !store_url) {
      return NextResponse.json({ error: 'competitor_id and store_url are required' }, { status: 400 })
    }

    // Verify competitor belongs to this user
    const { data: comp } = await supabase
      .from('competitors')
      .select('id, domain')
      .eq('id', competitor_id)
      .eq('user_id', ownerId)
      .single()

    if (!comp) return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })

    // Scrape
    let products: ShopifyProduct[]
    try {
      products = await scrapeShopifyProducts(store_url)
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 })
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found — make sure this is a Shopify store URL (e.g. wetwall.co.uk)' },
        { status: 422 }
      )
    }

    // Build upsert rows
    let storeOrigin: string
    try {
      storeOrigin = normaliseOrigin(store_url)
    } catch {
      return NextResponse.json({ error: 'Invalid store URL' }, { status: 400 })
    }

    const rows = products.map(p => {
      const prices = (p.variants ?? []).map(v => parseFloat(v.price)).filter(n => !isNaN(n))
      return {
        competitor_id,
        user_id:    ownerId,
        title:      p.title,
        url:        `${storeOrigin}/products/${p.handle}`,
        handle:     p.handle,
        image_url:  p.images?.[0]?.src ?? null,
        price_min:  prices.length ? Math.min(...prices) : null,
        price_max:  prices.length ? Math.max(...prices) : null,
        scraped_at: new Date().toISOString(),
      }
    })

    // Upsert in batches of 500 to avoid payload limits
    const BATCH = 500
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await supabase
        .from('competitor_catalogue')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'competitor_id,url' })
      if (error) return NextResponse.json({ error: `DB error: ${error.message}` }, { status: 500 })
    }

    // Update competitor metadata
    await supabase
      .from('competitors')
      .update({
        catalogue_url:             store_url,
        catalogue_last_scraped_at: new Date().toISOString(),
        catalogue_product_count:   products.length,
      })
      .eq('id', competitor_id)

    return NextResponse.json({ count: products.length, ok: true })

  } catch (err) {
    // Catch-all so the route always returns JSON, never a 500 HTML page
    console.error('[catalogue/scrape] unhandled error:', err)
    return NextResponse.json(
      { error: `Unexpected error: ${(err as Error).message ?? 'unknown'}` },
      { status: 500 }
    )
  }
}
