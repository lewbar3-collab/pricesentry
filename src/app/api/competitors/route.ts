import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'
import { getPlanLimits } from '@/lib/plans'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('user_id', profile.ownerId ?? profile.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id

  // Plan limit check
  const limits = getPlanLimits(profile.plan)
  if (limits.competitors !== null) {
    const { count } = await supabase
      .from('competitors')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ownerId)
    if ((count ?? 0) >= limits.competitors) {
      return NextResponse.json({
        error: `Plan limit reached. Your ${limits.label} plan allows ${limits.competitors} competitor${limits.competitors !== 1 ? 's' : ''}. Upgrade to add more.`,
        limitReached: true,
        plan: profile.plan,
      }, { status: 403 })
    }
  }

  const body = await req.json()
  const { data, error } = await supabase
    .from('competitors')
    .insert({ user_id: ownerId, name: body.name, domain: body.domain })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const { id, delivery_cost, free_delivery_threshold, min_order_qty } = await req.json()

  const { data, error } = await supabase
    .from('competitors')
    .update({
      delivery_cost: delivery_cost ?? null,
      free_delivery_threshold: free_delivery_threshold ?? null,
      min_order_qty: min_order_qty ?? 1,
    })
    .eq('id', id)
    .eq('user_id', ownerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
