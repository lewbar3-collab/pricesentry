import { requireClient, getImpersonatedUserId } from '@/lib/auth'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireClient()
  const impersonatedId = await getImpersonatedUserId()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr', minHeight: '100vh' }}>
      <Sidebar profile={profile} impersonating={!!impersonatedId} />
      <main style={{ padding: '28px 32px', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}
