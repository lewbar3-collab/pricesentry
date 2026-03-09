import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('*, competitor:competitors(*)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('products')
    .insert({
      user_id: profile.id,
      competitor_id: body.competitor_id,
      name: body.name,
      url: body.url,
      category: body.category ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('products')
    .update({ category: body.category ?? null })
    .eq('id', body.id)
    .eq('user_id', profile.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
