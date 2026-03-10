import { NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id

  // Try to insert a test product and capture the exact error
  const { data: testInsert, error: insertError } = await supabase
    .from('products')
    .insert({ user_id: ownerId, name: '__debug_test__', category: null })
    .select()
    .single()

  // Clean up if it succeeded
  if (testInsert?.id) {
    await supabase.from('products').delete().eq('id', testInsert.id)
  }

  // Check profiles table columns
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', ownerId)
    .single()

  return NextResponse.json({
    profile_id: profile.id,
    profile_email: profile.email,
    profile_role: profile.role,
    ownerId,
    test_insert_result: testInsert ?? null,
    test_insert_error: insertError ?? null,
    profile_row: profileRow,
  })
}
