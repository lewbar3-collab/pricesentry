import { NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id

  const { data: products } = await supabase
    .from('products')
    .select('id, name, user_id')
    .eq('user_id', ownerId)
    .limit(5)

  const { data: allProducts } = await supabase
    .from('products')
    .select('id, name, user_id')
    .limit(5)

  return NextResponse.json({
    profile_id: profile.id,
    profile_email: profile.email,
    profile_role: profile.role,
    ownerId,
    products_matching_ownerId: products,
    all_products_sample: allProducts,
  })
}
