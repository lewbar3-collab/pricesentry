'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile
}

const clientNav = [
  { label: 'Dashboard', href: '/dashboard', icon: '⊞' },
  { label: 'Price History', href: '/dashboard/history', icon: '📊' },
  { label: 'Alerts', href: '/dashboard/alerts', icon: '🔔' },
  { label: 'Competitors', href: '/dashboard/competitors', icon: '🏢' },
  { label: 'Products', href: '/dashboard/products', icon: '📦' },
  { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
]

const adminNav = [
  { label: 'Setup Queue', href: '/admin', icon: '📥', badge: 'queue' },
  { label: 'Errors', href: '/admin/errors', icon: '⚠️', badge: 'errors' },
  { label: 'Clients', href: '/admin/clients', icon: '👥' },
  { label: 'All Products', href: '/admin/products', icon: '🌐' },
  { label: 'Scrape Logs', href: '/admin/logs', icon: '📋' },
  { label: 'Scraper Config', href: '/admin/config', icon: '⚙️' },
  { label: 'Cron Jobs', href: '/admin/cron', icon: '📡' },
]

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = profile.role === 'admin'
  const nav = isAdmin ? adminNav : clientNav

  const initials = profile.company_name
    ? profile.company_name.slice(0, 2).toUpperCase()
    : profile.email.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
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
          <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👁</div>
          <div>
            <div className="font-display" style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>PriceSentry</div>
            <div
              className="font-mono"
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: isAdmin ? 'var(--purple)' : 'var(--accent)',
                background: isAdmin ? 'var(--purple-dim)' : 'var(--accent-dim)',
                border: `1px solid ${isAdmin ? 'rgba(167,139,250,0.25)' : 'rgba(0,229,160,0.2)'}`,
                padding: '2px 6px',
                borderRadius: 4,
                letterSpacing: '0.05em',
                marginTop: 3,
                display: 'inline-block',
              }}
            >
              {isAdmin ? 'ADMIN' : 'CLIENT'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '0 10px', flex: 1 }}>
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '8px 10px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 400,
                color: active ? (isAdmin ? 'var(--purple)' : 'var(--accent)') : 'var(--text-dim)',
                background: active ? (isAdmin ? 'var(--purple-dim)' : 'var(--accent-dim)') : 'transparent',
                border: active ? `1px solid ${isAdmin ? 'rgba(167,139,250,0.15)' : 'rgba(0,229,160,0.15)'}` : '1px solid transparent',
                textDecoration: 'none',
                marginBottom: 2,
                transition: 'all 0.15s',
                position: 'relative',
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
        {isAdmin && (
          <Link
            href="/dashboard"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 7, fontSize: 12.5, color: 'var(--text-dim)', textDecoration: 'none', border: '1px solid var(--border)', marginBottom: 8, transition: 'all 0.15s' }}
          >
            <span>↗</span> Client View
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
