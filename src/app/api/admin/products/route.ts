import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

// GET all pending products across all clients
export async function GET() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, competitor:competitors(*), profile:profiles(email, company_name)')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update competitor scraper config and go live
export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const supabase = await createAdminClient()
  const body = await req.json()

  const { competitor_id, product_id, ...config } = body

  // Update competitor scraper config
  if (competitor_id) {
    const { error: compError } = await supabase
      .from('competitors')
      .update({
        scrape_method: config.scrape_method,
        price_selector: config.price_selector,
        needs_proxy: config.needs_proxy ?? false,
        check_frequency_hours: config.check_frequency_hours ?? 6,
        notes: config.notes ?? null,
      })
      .eq('id', competitor_id)

    if (compError) return NextResponse.json({ error: compError.message }, { status: 500 })
  }

  // Set product live
  if (product_id && config.go_live) {
    const { error: prodError } = await supabase
      .from('products')
      .update({ status: 'live' })
      .eq('id', product_id)

    if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
