import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const profile = await getProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const supabase = await createAdminClient()
    const ownerId  = profile.ownerId ?? profile.id

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file      = formData.get('file') as File | null
    const productId = formData.get('product_id') as string | null

    if (!file || !productId) {
      return NextResponse.json({ error: 'Missing file or product_id' }, { status: 400 })
    }

    // Verify product belongs to this user
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('user_id', ownerId)
      .single()

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${ownerId}/${productId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      console.error('[products/upload] storage error:', uploadError)
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
    console.error('[products/upload] unhandled:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
