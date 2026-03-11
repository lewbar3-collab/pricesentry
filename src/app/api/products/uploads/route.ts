import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export const config = {
  api: { bodyParser: false },
}

// Increase Vercel function body size limit
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const profile  = await requireClient()
    const supabase = await createAdminClient()
    const ownerId  = profile.ownerId ?? profile.id

    const formData  = await req.formData()
    const file      = formData.get('file') as File | null
    const productId = formData.get('product_id') as string | null

    if (!file || !productId) {
      return NextResponse.json({ error: 'Missing file or product_id' }, { status: 400 })
    }

    // Check file size (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 4MB' }, { status: 413 })
    }

    // Verify product belongs to this user
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', ownerId)
      .single()

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    // Convert File to ArrayBuffer → Buffer for Supabase storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${ownerId}/${productId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, buffer, {
        upsert:      true,
        contentType: file.type || `image/${ext}`,
      })

    if (uploadError) {
      console.error('[upload] storage error:', uploadError.message)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)

    await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .eq('id', productId)

    return NextResponse.json({ url: publicUrl })

  } catch (err) {
    console.error('[upload] unhandled:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown server error' },
      { status: 500 }
    )
  }
}
