import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'


async function checkAdmin() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') return null
  return profile
}

export async function GET() {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, competitor:competitors(*), profile:profiles(email, company_name)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const supabase = await createAdminClient()
  const body = await req.json()

  const { competitor_id, scrape_method, sale_price_selector, price_selector, check_frequency_hours, notes, go_live } = body

  // Update competitor config
  const { error: compError } = await supabase
    .from('competitors')
    .update({ scrape_method, sale_price_selector, price_selector, check_frequency_hours, notes })
    .eq('id', competitor_id)

  if (compError) return NextResponse.json({ error: compError.message }, { status: 500 })

  // If going live, activate ALL pending competitor_products under this competitor
  if (go_live) {
    const { error: cpError } = await supabase
      .from('competitor_products')
      .update({ status: 'live' })
      .eq('competitor_id', competitor_id)
      .eq('status', 'pending')

    if (cpError) return NextResponse.json({ error: cpError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
