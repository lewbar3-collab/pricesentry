import { requireClient } from '@/lib/auth'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireClient()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', minHeight: '100vh' }}>
      <Sidebar profile={profile} />
      <main style={{ padding: '28px 32px', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
