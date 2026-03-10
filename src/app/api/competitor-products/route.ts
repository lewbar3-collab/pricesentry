import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const body = await req.json()

  // Verify product belongs to this account
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', body.product_id)
    .eq('user_id', ownerId)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Check if competitor already has either selector configured — if so go straight to live
  const { data: competitor } = await supabase
    .from('competitors')
    .select('sale_price_selector, price_selector')
    .eq('id', body.competitor_id)
    .single()

  const isConfigured = !!(competitor?.sale_price_selector || competitor?.price_selector)
  const status = isConfigured ? 'live' : 'pending'

  const { data, error } = await supabase
    .from('competitor_products')
    .insert({
      product_id: body.product_id,
      competitor_id: body.competitor_id,
      user_id: ownerId,
      url: body.url,
      status,
    })
    .select('*, competitor:competitors(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const { id } = await req.json()

  const { error } = await supabase
    .from('competitor_products')
    .delete()
    .eq('id', id)
    .eq('user_id', ownerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const { getProfile } = await import('@/lib/auth')
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const supabase = await createAdminClient()
  const body = await req.json()

  const { error } = await supabase
    .from('competitor_products')
    .update({ status: 'live' })
    .eq('competitor_id', body.competitor_id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
