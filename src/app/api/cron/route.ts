import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { scrapePrice } from '@/lib/scraper'

export const dynamic = 'force-dynamic'

function isAuthorised(req: NextRequest) {
  if (req.headers.get('x-vercel-cron') === '1') return true
  if (req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) return true
  return false
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const url = new URL(req.url)
  return runScrape(url.searchParams.get('competitor_id'))
}

export async function POST(req: NextRequest) {
  const { getProfile } = await import('@/lib/auth')
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const competitorId = body.competitor_id ?? null

  if (profile.role === 'client' && competitorId) {
    const supabase = await createAdminClient()
    const { data } = await supabase
      .from('competitors').select('user_id').eq('id', competitorId).single()
    if (!data || data.user_id !== profile.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return runScrape(competitorId)
}

async function runScrape(competitorId: string | null) {
  const supabase = await createAdminClient()
  const results = { success: 0, errors: 0, alerts: 0, skipped: 0 }

  try {
    let query = supabase
      .from('competitor_products')
      .select('*, competitor:competitors(*), product:products(*)')
      .eq('status', 'live')

    if (competitorId) query = query.eq('competitor_id', competitorId)

    const { data: competitorProducts, error } = await query
    if (error) throw error
    if (!competitorProducts?.length) return NextResponse.json({ message: 'No live competitor products', ...results })

    for (const cp of competitorProducts) {
      const competitor = cp.competitor
      if (!competitor?.sale_price_selector && !competitor?.price_selector) { results.skipped++; continue }

      const jobStart = Date.now()
      const { data: job } = await supabase
        .from('scrape_jobs')
        .insert({ product_id: cp.product_id, competitor_product_id: cp.id, status: 'running' })
        .select().single()

      const result = await scrapePrice(cp.url, competitor.sale_price_selector ?? null, competitor.price_selector ?? null, competitor.scrape_method)
      const duration = Date.now() - jobStart

      if (result.price !== null) {
        results.success++
        await supabase.from('price_history').insert({
          product_id: cp.product_id,
          competitor_product_id: cp.id,
          price: result.price,
          scrape_duration_ms: duration,
        })

        const oldPrice = cp.last_price
        if (oldPrice !== null && oldPrice !== result.price) {
          // Alert processing — pass product info
          const { processAlerts } = await import('@/lib/alerts')
          results.alerts += await processAlerts(supabase, cp, oldPrice, result.price)
        }

        await supabase.from('competitor_products')
          .update({ last_price: result.price, last_scraped_at: new Date().toISOString() })
          .eq('id', cp.id)

        if (job) await supabase.from('scrape_jobs')
          .update({ status: 'success', price_found: result.price, duration_ms: duration })
          .eq('id', job.id)
      } else {
        results.errors++
        await supabase.from('competitor_products')
          .update({ status: 'error', last_scraped_at: new Date().toISOString() })
          .eq('id', cp.id)
        if (job) await supabase.from('scrape_jobs')
          .update({ status: 'error', error_message: result.error, duration_ms: duration })
          .eq('id', job.id)
      }
    }

    return NextResponse.json({ message: `Scrape complete: ${results.success} success, ${results.errors} errors`, ...results })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
