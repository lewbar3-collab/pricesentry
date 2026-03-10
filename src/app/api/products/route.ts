import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id

  const { data, error } = await supabase
    .from('products')
    .select('*, competitor_products(*, competitor:competitors(*))')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const body = await req.json()

  const { data, error } = await supabase
    .from('products')
    .insert({ user_id: ownerId, name: body.name, category: body.category ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const body = await req.json()

  const { data, error } = await supabase
    .from('products')
    .update({ category: body.category ?? null, name: body.name })
    .eq('id', body.id)
    .eq('user_id', ownerId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
