'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile
  impersonating?: boolean
}

const clientNav = [
  { label: 'Dashboard', href: '/dashboard', icon: '⊞' },
  { label: 'Price History', href: '/dashboard/history', icon: '📊' },
  { label: 'Competitors', href: '/dashboard/competitors', icon: '🏢' },
  { label: 'Products', href: '/dashboard/products', icon: '📦' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
]

const adminNav = [
  { label: 'Setup Queue', href: '/admin', icon: '📥', badge: 'queue' },
  { label: 'Errors', href: '/admin/errors', icon: '⚠️' },
  { label: 'Clients', href: '/admin/clients', icon: '👥' },
  { label: 'All Products', href: '/admin/products', icon: '🌐' },
  { label: 'Scrape Logs', href: '/admin/logs', icon: '📋' },
  { label: 'Scraper Config', href: '/admin/config', icon: '⚙️' },
  { label: 'Cron Jobs', href: '/admin/cron', icon: '📡' },
]

export default function Sidebar({ profile, impersonating = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = profile.role === 'admin'
  const nav = isAdmin && !impersonating ? adminNav : clientNav

  const initials = (profile.company_name || profile.email).slice(0, 2).toUpperCase()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function stopImpersonating() {
    await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: null }),
    })
    router.push('/admin')
  }

  return (
    <aside
      className="animate-fade-left"
      style={{
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        width: 220,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo-icon.svg" alt="PriceSentry" style={{ width: 32, height: 32, flexShrink: 0, filter: impersonating ? 'hue-rotate(200deg)' : 'none', transition: 'filter 0.2s' }} />
          <div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>PriceSentry</div>
            <div
              className="font-mono"
              style={{
                fontSize: 9, fontWeight: 500,
                color: impersonating ? 'var(--purple)' : isAdmin ? 'var(--purple)' : 'var(--accent)',
                background: impersonating ? 'var(--purple-dim)' : isAdmin ? 'var(--purple-dim)' : 'var(--accent-dim)',
                border: `1px solid ${impersonating || isAdmin ? 'rgba(167,139,250,0.25)' : 'rgba(0,229,160,0.2)'}`,
                padding: '2px 6px', borderRadius: 4,
                letterSpacing: '0.05em', marginTop: 3, display: 'inline-block',
              }}
            >
              {impersonating ? 'PREVIEW' : isAdmin ? 'ADMIN' : 'CLIENT'}
            </div>
          </div>
        </div>

        {/* Impersonation banner */}
        {impersonating && (
          <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--purple-dim)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 7 }}>
            <div className="font-mono" style={{ fontSize: 9, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Viewing as</div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.company_name || profile.email}
            </div>
            <button
              onClick={stopImpersonating}
              style={{ marginTop: 6, width: '100%', padding: '4px 0', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 5, fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Mono, monospace' }}
            >
              ← Back to Admin
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ padding: '0 10px', flex: 1 }}>
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && item.href !== '/dashboard' && pathname.startsWith(item.href))
          const accentColor = impersonating ? 'var(--purple)' : isAdmin && !impersonating ? 'var(--purple)' : 'var(--accent)'
          const accentDim = impersonating ? 'var(--purple-dim)' : isAdmin && !impersonating ? 'var(--purple-dim)' : 'var(--accent-dim)'
          const accentBorder = impersonating ? 'rgba(167,139,250,0.15)' : isAdmin && !impersonating ? 'rgba(167,139,250,0.15)' : 'rgba(0,229,160,0.15)'
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 7,
                fontSize: 13, fontWeight: 400,
                color: active ? accentColor : 'var(--text-dim)',
                background: active ? accentDim : 'transparent',
                border: active ? `1px solid ${accentBorder}` : '1px solid transparent',
                textDecoration: 'none', marginBottom: 2,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 14, width: 16, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 10px 0', borderTop: '1px solid var(--border)' }}>
        {isAdmin && !impersonating && (
          <Link
            href="/admin/impersonate"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 7, fontSize: 12.5, color: 'var(--text-dim)', textDecoration: 'none', border: '1px solid var(--border)', marginBottom: 8, transition: 'all 0.15s' }}
          >
            <span>👁</span> Client View
          </Link>
        )}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 7, cursor: 'pointer' }}
          onClick={handleSignOut}
        >
          <div
            style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4d9fff, #00e5a0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}
            className="font-display"
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.company_name || profile.email}
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sign out</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
