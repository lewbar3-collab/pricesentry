import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, competitor:competitors(*), profile:profiles(email, company_name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  await requireAdmin()
  const supabase = await createAdminClient()
  const body = await req.json()

  const { competitor_id, scrape_method, price_selector, check_frequency_hours, notes, go_live } = body

  // Update competitor config
  const { error: compError } = await supabase
    .from('competitors')
    .update({ scrape_method, price_selector, check_frequency_hours, notes })
    .eq('id', competitor_id)

  if (compError) return NextResponse.json({ error: compError.message }, { status: 500 })

  // If going live, activate ALL pending products under this competitor
  if (go_live) {
    const { error: prodError } = await supabase
      .from('products')
      .update({ status: 'live' })
      .eq('competitor_id', competitor_id)
      .eq('status', 'pending')

    if (prodError) return NextResponse.json({ error: prodError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
