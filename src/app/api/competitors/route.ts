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
