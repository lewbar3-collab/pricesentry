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

  const { data, error } = await supabase
    .from('competitor_products')
    .insert({
      product_id: body.product_id,
      competitor_id: body.competitor_id,
      user_id: profile.id,
      url: body.url,
      status: 'pending',
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
