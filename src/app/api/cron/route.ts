import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { scrapePrice } from '@/lib/scraper'
import type { Product, AlertRule } from '@/types'

export const dynamic = 'force-dynamic'

function isAuthorised(req: NextRequest) {
  const cronHeader = req.headers.get('x-vercel-cron')
  if (cronHeader === '1') return true
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${process.env.CRON_SECRET}`) return true
  return false
}

export async function GET(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const url = new URL(req.url)
  const competitorId = url.searchParams.get('competitor_id')
  return runScrape(competitorId)
}

export async function POST(req: NextRequest) {
  // Allow admins or clients — clients can only refresh their own competitors
  const { getProfile } = await import('@/lib/auth')
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const competitorId = body.competitor_id ?? null

  // If client, verify they own this competitor
  if (profile.role === 'client' && competitorId) {
    const supabase = await createAdminClient()
    const { data: competitor } = await supabase
      .from('competitors')
      .select('user_id')
      .eq('id', competitorId)
      .single()

    if (!competitor || competitor.user_id !== profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
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
      .from('products')
      .select('*, competitor:competitors(*)')
      .eq('status', 'live')

    if (competitorId) query = query.eq('competitor_id', competitorId)

    const { data: products, error } = await query
    if (error) throw error
    if (!products?.length) return NextResponse.json({ message: 'No live products to scrape', ...results })

    for (const product of products) {
      const competitor = product.competitor
      if (!competitor?.price_selector) { results.skipped++; continue }

      const jobStart = Date.now()
      const { data: job } = await supabase
        .from('scrape_jobs')
        .insert({ product_id: product.id, status: 'running' })
        .select().single()

      const result = await scrapePrice(product.url, competitor.price_selector, competitor.scrape_method)
      const duration = Date.now() - jobStart

      if (result.price !== null) {
        results.success++
        await supabase.from('price_history').insert({ product_id: product.id, price: result.price, scrape_duration_ms: duration })

        const oldPrice = product.last_price
        if (oldPrice !== null && oldPrice !== result.price) {
          results.alerts += await processAlerts(supabase, product, oldPrice, result.price)
        }

        await supabase.from('products').update({ last_price: result.price, last_scraped_at: new Date().toISOString() }).eq('id', product.id)
        if (job) await supabase.from('scrape_jobs').update({ status: 'success', price_found: result.price, duration_ms: duration }).eq('id', job.id)
      } else {
        results.errors++
        await supabase.from('products').update({ status: 'error', last_scraped_at: new Date().toISOString() }).eq('id', product.id)
        if (job) await supabase.from('scrape_jobs').update({ status: 'error', error_message: result.error, duration_ms: duration }).eq('id', job.id)
      }
    }

    return NextResponse.json({ message: `Scrape complete: ${results.success} success, ${results.errors} errors`, ...results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function processAlerts(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  product: Product,
  oldPrice: number,
  newPrice: number
): Promise<number> {
  const changeAmount = newPrice - oldPrice
  const { data: rules } = await supabase.from('alert_rules').select('*').eq('product_id', product.id).eq('is_active', true)
  if (!rules?.length) return 0

  let alertsSent = 0
  for (const rule of rules as AlertRule[]) {
    let shouldAlert = false
    switch (rule.trigger) {
      case 'any_change': shouldAlert = true; break
      case 'drops_by': shouldAlert = changeAmount < 0 && Math.abs(changeAmount) >= (rule.threshold ?? 0); break
      case 'rises_above': shouldAlert = changeAmount > 0 && changeAmount >= (rule.threshold ?? 0); break
      case 'below_price': shouldAlert = newPrice < (rule.threshold ?? 0); break
      case 'above_price': shouldAlert = newPrice > (rule.threshold ?? 0); break
    }
    if (shouldAlert) {
      try {
        const { sendPriceChangeAlert } = await import('@/lib/email')
        await sendPriceChangeAlert({ product, alertRule: rule, oldPrice, newPrice })
        await supabase.from('alert_logs').insert({ alert_rule_id: rule.id, product_id: product.id, old_price: oldPrice, new_price: newPrice, change_amount: changeAmount, change_percent: ((changeAmount / oldPrice) * 100), email_sent: true })
        alertsSent++
      } catch { /* email failed */ }
    }
  }
  return alertsSent
}
