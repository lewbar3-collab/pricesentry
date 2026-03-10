import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Profile } from '@/types'

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function requireAdmin() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') redirect('/login')
  return profile
}

// Resolve the "owner" id for data scoping.
// - If admin impersonating → return impersonated profile
// - If user is a teammate → return the owner's profile (so they see owner's data)
// - Otherwise → return own profile
export async function requireClient(): Promise<Profile & { ownerId: string }> {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  // Admin impersonation
  if (profile.role === 'admin') {
    const cookieStore = await cookies()
    const impersonateId = cookieStore.get('impersonate_user_id')?.value
    if (impersonateId) {
      const supabase = await createAdminClient()
      const { data: impersonatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', impersonateId)
        .single()
      if (impersonatedProfile) return { ...impersonatedProfile, ownerId: impersonatedProfile.id }
    }
    return { ...profile, ownerId: profile.id }
  }

  // Teammate resolution — check if this user is a member of someone else's account
  const supabase = await createAdminClient()
  const { data: membership } = await supabase
    .from('team_members')
    .select('owner_id')
    .eq('member_id', profile.id)
    .eq('status', 'active')
    .single()

  if (membership) {
    // Load owner profile for plan/limits, but keep member profile for identity
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', membership.owner_id)
      .single()
    if (ownerProfile) {
      // Return owner profile so data queries use owner's user_id,
      // but expose both ids for display purposes
      return { ...ownerProfile, ownerId: ownerProfile.id }
    }
  }

  return { ...profile, ownerId: profile.id }
}

export async function getImpersonatedUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('impersonate_user_id')?.value ?? null
}
