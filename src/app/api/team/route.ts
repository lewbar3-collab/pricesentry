import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'
import { getPlanLimits } from '@/lib/plans'

export async function GET() {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('owner_id', ownerId)
    .neq('status', 'removed')
    .order('invited_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const body = await req.json()

  // Seat limit check (seats = owner + teammates)
  const limits = getPlanLimits(profile.plan)
  const { count } = await supabase
    .from('team_members')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'active')

  const totalSeats = (count ?? 0) + 1 // +1 for owner
  if (totalSeats >= limits.seats) {
    return NextResponse.json({
      error: `Your ${limits.label} plan allows ${limits.seats} seat${limits.seats !== 1 ? 's' : ''} total. Upgrade to add more teammates.`,
      limitReached: true,
    }, { status: 403 })
  }

  // Don't invite yourself or existing members
  if (body.email === profile.email) {
    return NextResponse.json({ error: 'You cannot invite yourself.' }, { status: 400 })
  }

  // Create the invite record
  const { data: invite, error: inviteError } = await supabase
    .from('team_members')
    .insert({ owner_id: ownerId, invite_email: body.email, status: 'pending' })
    .select()
    .single()

  if (inviteError) {
    if (inviteError.code === '23505') return NextResponse.json({ error: 'This email has already been invited.' }, { status: 400 })
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Send Supabase invite email
  try {
    await supabase.auth.admin.inviteUserByEmail(body.email, {
      data: { invited_by: ownerId, owner_id: ownerId },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/join`,
    })
  } catch {
    // Invite record created, email may have failed — still return success
  }

  return NextResponse.json(invite, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const profile = await requireClient()
  const supabase = await createAdminClient()
  const ownerId = profile.ownerId ?? profile.id
  const { id } = await req.json()

  const { error } = await supabase
    .from('team_members')
    .update({ status: 'removed' })
    .eq('id', id)
    .eq('owner_id', ownerId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
