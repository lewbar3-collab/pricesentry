import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('user_id', ownerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const body = await req.json()

  const { data, error } = await supabase
    .from('alert_rules')
    .insert({
      user_id: ownerId,
      competitor_product_id: body.competitor_product_id,
      trigger_type: body.trigger_type,
      threshold_value: body.threshold_value ?? null,
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
  const ownerId = profile.ownerId ?? profile.id
  const { id } = await req.json()

  const { error } = await supabase
    .from('alert_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', ownerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const body = await req.json()

  const { data, error } = await supabase
    .from('alert_rules')
    .update({ is_active: body.is_active })
    .eq('id', body.id)
    .eq('user_id', ownerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
