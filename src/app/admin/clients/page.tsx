import { createAdminClient } from '@/lib/supabase/server'

export default async function AdminClientsPage() {
  const supabase = await createAdminClient()

  const { data: clients } = await supabase
    .from('profiles')
    .select('*, products(count)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  const gradients = [
    'linear-gradient(135deg,#4d9fff,#00e5a0)',
    'linear-gradient(135deg,#ff4d6a,#ffb83f)',
    'linear-gradient(135deg,#a78bfa,#4d9fff)',
    'linear-gradient(135deg,#00e5a0,#4d9fff)',
    'linear-gradient(135deg,#ffb83f,#ff4d6a)',
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Clients</h1>
        <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>{clients?.length ?? 0} registered clients</p>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {clients?.map((client, i) => {
          const initials = (client.company_name || client.email).slice(0, 2).toUpperCase()
          const productCount = client.products?.[0]?.count ?? 0

          return (
            <div
              key={client.id}
              className="animate-fade-up"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, animationDelay: `${0.1 + i * 0.05}s` }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 11, background: gradients[i % gradients.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }} className="font-display">
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 3 }}>{client.company_name || 'Unnamed Company'}</div>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {client.email} · Joined {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ textAlign: 'center', marginRight: 16 }}>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 22, color: 'var(--text)' }}>{productCount}</div>
                <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Products</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: client.plan === 'pro' ? 'var(--accent)' : 'var(--text-muted)', background: client.plan === 'pro' ? 'var(--accent-dim)' : 'var(--surface2)', border: `1px solid ${client.plan === 'pro' ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, padding: '3px 10px', borderRadius: 6 }} className="font-mono">
                  {client.plan?.toUpperCase()}
                </div>
              </div>
            </div>
          )
        })}

        {clients?.length === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No clients yet. Clients appear here after they register.
          </div>
        )}
      </div>
    </div>
  )
}
