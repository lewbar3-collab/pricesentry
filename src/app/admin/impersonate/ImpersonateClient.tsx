'use client'

import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

interface Props {
  clients: (Profile & { products?: { count: number }[] })[]
}

export default function ImpersonateClient({ clients }: Props) {
  const router = useRouter()

  async function startImpersonation(userId: string) {
    await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    router.push('/dashboard')
  }

  const gradients = [
    'linear-gradient(135deg,#4d9fff,#00e5a0)',
    'linear-gradient(135deg,#ff4d6a,#ffb83f)',
    'linear-gradient(135deg,#a78bfa,#4d9fff)',
    'linear-gradient(135deg,#00e5a0,#4d9fff)',
    'linear-gradient(135deg,#ffb83f,#ff4d6a)',
  ]

  if (clients.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
        No clients yet. Clients appear here after they register.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {clients.map((client, i) => {
        const initials = (client.company_name || client.email).slice(0, 2).toUpperCase()
        const productCount = client.products?.[0]?.count ?? 0

        return (
          <div
            key={client.id}
            className="animate-fade-up"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 13,
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              animationDelay: `${0.1 + i * 0.05}s`,
            }}
          >
            <div
              style={{ width: 44, height: 44, borderRadius: 11, background: gradients[i % gradients.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}
              className="font-display"
            >
              {initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 3 }}>
                {client.company_name || 'Unnamed Company'}
              </div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {client.email} · {productCount} products · joined {new Date(client.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>

            <div style={{ textAlign: 'center', marginRight: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: client.plan === 'pro' ? 'var(--accent)' : 'var(--text-muted)', background: client.plan === 'pro' ? 'var(--accent-dim)' : 'var(--surface2)', border: `1px solid ${client.plan === 'pro' ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, padding: '3px 10px', borderRadius: 6 }} className="font-mono">
                {client.plan?.toUpperCase() ?? 'FREE'}
              </div>
            </div>

            <button
              onClick={() => startImpersonation(client.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: 'var(--purple-dim)', color: 'var(--purple)',
                border: '1px solid rgba(167,139,250,0.25)',
                cursor: 'pointer', transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              👁 View as Client
            </button>
          </div>
        )
      })}
    </div>
  )
}
