import { NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const profile = await requireClient()

  // Debug: also fetch raw from DB to compare
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminSupabase = await createAdminClient()
  const { data: rawProfile, error } = await adminSupabase
    .from('profiles')
    .select('id, email, plan, role')
    .eq('id', user?.id ?? '')
    .single()

  console.log('[/api/profile] auth user id:', user?.id)
  console.log('[/api/profile] raw DB profile:', rawProfile, 'error:', error)
  console.log('[/api/profile] requireClient returned plan:', profile.plan, 'ownerId:', profile.ownerId)

  return NextResponse.json({
    email: profile.email,
    full_name: profile.full_name,
    company_name: profile.company_name,
    plan: profile.plan,
    _debug: { rawPlan: rawProfile?.plan, resolvedPlan: profile.plan, userId: user?.id, ownerId: profile.ownerId }
  })
}
