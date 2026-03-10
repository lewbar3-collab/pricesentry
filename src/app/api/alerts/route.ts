import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('user_id', profile.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const body = await req.json()

  // Verify competitor_product belongs to user
  const { data: cp } = await supabase
    .from('competitor_products')
    .select('id, product_id')
    .eq('id', body.competitor_product_id)
    .eq('user_id', profile.id)
    .single()
  if (!cp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('alert_rules')
    .insert({
      user_id: profile.id,
      product_id: cp.product_id,
      competitor_product_id: body.competitor_product_id,
      trigger: body.trigger,
      threshold: body.threshold ?? null,
      email: body.email,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const { id } = await req.json()
  const { error } = await supabase
    .from('alert_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', profile.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const body = await req.json()
  const { data, error } = await supabase
    .from('alert_rules')
    .update({ is_active: body.is_active })
    .eq('id', body.id)
    .eq('user_id', profile.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
