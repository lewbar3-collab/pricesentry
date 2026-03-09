import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const body = await req.json()

  // Verify product belongs to user
  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('id', body.product_id)
    .eq('user_id', profile.id)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Check if competitor already has a selector configured — if so go straight to live
  const { data: competitor } = await supabase
    .from('competitors')
    .select('price_selector')
    .eq('id', body.competitor_id)
    .single()

  const status = competitor?.price_selector ? 'live' : 'pending'

  const { data, error } = await supabase
    .from('competitor_products')
    .insert({
      product_id: body.product_id,
      competitor_id: body.competitor_id,
      user_id: profile.id,
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
  const { id } = await req.json()

  const { error } = await supabase
    .from('competitor_products')
    .delete()
    .eq('id', id)
    .eq('user_id', profile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  // Admin can manually activate pending competitor_products for a configured competitor
  const { requireAdmin } = await import('@/lib/auth')
  await requireAdmin()
  const supabase = await createAdminClient()
  const body = await req.json()

  // Activate all pending for this competitor
  const { error } = await supabase
    .from('competitor_products')
    .update({ status: 'live' })
    .eq('competitor_id', body.competitor_id)
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
