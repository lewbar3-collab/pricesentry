import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  images: { src: string }[]
  variants: { price: string }[]
}

async function scrapeShopifyProducts(baseUrl: string): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = []
  let page = 1

  // Normalise base URL — strip trailing slash and any path beyond origin
  const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`)
  const origin = url.origin

  while (true) {
    const endpoint = `${origin}/products.json?limit=250&page=${page}`
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PriceSentry/1.0)',
        'Accept': 'application/json',
        'CF-IPCountry': 'GB',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) break
    const json = await res.json()
    const products: ShopifyProduct[] = json.products ?? []
    if (products.length === 0) break

    all.push(...products)
    if (products.length < 250) break
    page++
    if (page > 20) break // safety cap — 5000 products max
  }

  return all
}

// POST /api/catalogue/scrape
export async function POST(req: NextRequest) {
  const profile  = await requireClient()
  const supabase = await createAdminClient()
  const ownerId  = profile.ownerId ?? profile.id

  const { competitor_id, store_url } = await req.json()
  if (!competitor_id || !store_url) {
    return NextResponse.json({ error: 'competitor_id and store_url required' }, { status: 400 })
  }

  // Verify competitor belongs to this user
  const { data: comp } = await supabase
    .from('competitors')
    .select('id, domain')
    .eq('id', competitor_id)
    .eq('user_id', ownerId)
    .single()
  if (!comp) return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })

  let products: ShopifyProduct[]
  try {
    products = await scrapeShopifyProducts(store_url)
  } catch (err) {
    return NextResponse.json({ error: `Scrape failed: ${(err as Error).message}` }, { status: 502 })
  }

  if (products.length === 0) {
    return NextResponse.json({ error: 'No products found — is this a Shopify store?' }, { status: 422 })
  }

  // Build upsert rows
  const storeOrigin = new URL(store_url.startsWith('http') ? store_url : `https://${store_url}`).origin

  const rows = products.map(p => {
    const prices = p.variants.map(v => parseFloat(v.price)).filter(n => !isNaN(n))
    return {
      competitor_id,
      user_id:   ownerId,
      title:     p.title,
      url:       `${storeOrigin}/products/${p.handle}`,
      handle:    p.handle,
      image_url: p.images?.[0]?.src ?? null,
      price_min: prices.length ? Math.min(...prices) : null,
      price_max: prices.length ? Math.max(...prices) : null,
      scraped_at: new Date().toISOString(),
    }
  })

  const { error: upsertError } = await supabase
    .from('competitor_catalogue')
    .upsert(rows, { onConflict: 'competitor_id,url' })

  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  // Update competitor metadata
  await supabase
    .from('competitors')
    .update({
      catalogue_url:              store_url,
      catalogue_last_scraped_at:  new Date().toISOString(),
      catalogue_product_count:    products.length,
    })
    .eq('id', competitor_id)

  return NextResponse.json({ count: products.length, ok: true })
}
