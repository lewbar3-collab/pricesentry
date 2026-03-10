import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/auth'

export async function POST() {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const supabase = await createAdminClient()

  // Find pending invite for this email
  const { data: invite } = await supabase
    .from('team_members')
    .select('*')
    .eq('invite_email', profile.email)
    .eq('status', 'pending')
    .single()

  if (!invite) return NextResponse.json({ error: 'No pending invite found' }, { status: 404 })

  // Activate it
  const { error } = await supabase
    .from('team_members')
    .update({ member_id: profile.id, status: 'active', joined_at: new Date().toISOString() })
    .eq('id', invite.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
