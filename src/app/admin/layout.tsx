import { requireAdmin } from '@/lib/auth'
import Sidebar from '@/components/ui/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', minHeight: '100vh' }}>
      <Sidebar profile={profile} />
      <main style={{ padding: '28px 32px', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
