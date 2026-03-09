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

// For client pages - if admin is impersonating return that profile,
// otherwise return their own profile (admins can browse client pages as themselves)
export async function requireClient(): Promise<Profile> {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  // If admin is impersonating a client, return that client's profile
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
      if (impersonatedProfile) return impersonatedProfile
    }
    // Admin with no impersonation - return own profile so they can browse
    return profile
  }

  return profile
}

export async function getImpersonatedUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('impersonate_user_id')?.value ?? null
}
