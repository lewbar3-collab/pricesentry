import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

// GET /api/catalogue?competitor_id=X&q=search
export async function GET(req: NextRequest) {
  const profile  = await requireClient()
  const supabase = await createAdminClient()
  const ownerId  = profile.ownerId ?? profile.id

  const { searchParams } = new URL(req.url)
  const competitorId = searchParams.get('competitor_id')
  const q            = searchParams.get('q')?.trim() ?? ''

  if (!competitorId) return NextResponse.json([])

  let query = supabase
    .from('competitor_catalogue')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('user_id', ownerId)
    .order('title', { ascending: true })
    .limit(50)

  if (q) query = query.ilike('title', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// PATCH /api/catalogue — update schedule for a competitor
export async function PATCH(req: NextRequest) {
  const profile  = await requireClient()
  const supabase = await createAdminClient()
  const ownerId  = profile.ownerId ?? profile.id
  const { competitor_id, catalogue_schedule } = await req.json()

  const { error } = await supabase
    .from('competitors')
    .update({ catalogue_schedule: catalogue_schedule ?? null })
    .eq('id', competitor_id)
    .eq('user_id', ownerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
