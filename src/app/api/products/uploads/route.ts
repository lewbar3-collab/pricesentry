import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

// This route no longer handles file data — the browser uploads directly
// to Supabase Storage. This endpoint just persists the resulting public URL.
export async function POST(req: NextRequest) {
  try {
    const profile  = await requireClient()
    const supabase = await createAdminClient()
    const ownerId  = profile.ownerId ?? profile.id

    const { product_id, url } = await req.json()
    if (!product_id || !url) {
      return NextResponse.json({ error: 'Missing product_id or url' }, { status: 400 })
    }

    const { error } = await supabase
      .from('products')
      .update({ image_url: url })
      .eq('id', product_id)
      .eq('user_id', ownerId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ url })

  } catch (err) {
    console.error('[upload] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
