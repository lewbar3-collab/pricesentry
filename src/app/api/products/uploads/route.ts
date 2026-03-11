import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const profile  = await requireClient()
    const supabase = await createAdminClient()
    const ownerId  = profile.ownerId ?? profile.id

    const { product_id, data: base64, mime_type, ext } = await req.json()

    if (!product_id || !base64 || !mime_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify product belongs to this user
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .eq('user_id', ownerId)
      .single()
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // Decode base64 → Buffer
    const buffer   = Buffer.from(base64, 'base64')
    const fileExt  = (ext ?? 'jpg').toLowerCase().replace(/^\./, '')
    const path     = `${ownerId}/${product_id}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, { upsert: true, contentType: mime_type })

    if (uploadError) {
      console.error('[upload] storage error:', uploadError.message)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    await supabase.from('products').update({ image_url: publicUrl }).eq('id', product_id)

    return NextResponse.json({ url: publicUrl })

  } catch (err) {
    console.error('[upload] unhandled:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
