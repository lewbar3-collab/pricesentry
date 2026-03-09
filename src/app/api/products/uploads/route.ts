import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const productId = formData.get('product_id') as string | null

  if (!file || !productId) {
    return NextResponse.json({ error: 'Missing file or product_id' }, { status: 400 })
  }

  const { data: product } = await supabase
    .from('products')
    .select('id, user_id')
    .eq('id', productId)
    .eq('user_id', profile.id)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${profile.id}/${productId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(path)

  await supabase.from('products').update({ image_url: publicUrl }).eq('id', productId)

  return NextResponse.json({ url: publicUrl })
}
