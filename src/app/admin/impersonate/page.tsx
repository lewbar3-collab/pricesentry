import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import ImpersonateClient from './ImpersonateClient'

export default async function ImpersonatePage() {
  await requireAdmin()
  const supabase = await createAdminClient()

  const { data: clients } = await supabase
    .from('profiles')
    .select('*, products(count)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>
          Client View
        </h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Select a client to preview their dashboard — useful for support
        </p>
      </div>

      <ImpersonateClient clients={clients ?? []} />
    </div>
  )
}
