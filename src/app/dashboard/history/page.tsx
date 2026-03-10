import { createAdminClient } from '@/lib/supabase/server'
import { requireClient } from '@/lib/auth'
import ClientRefreshButton from '@/components/ui/ClientRefreshButton'
import HistoryProductCard from '@/components/ui/HistoryProductCard'

export default async function HistoryPage() {
  const profile = await requireClient()
  const supabase = await createAdminClient()

  // Fetch products with their competitor_products
  const { data: products } = await supabase
    .from('products')
    .select('*, competitor_products(*, competitor:competitors(id, name, domain))')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const cpIds = products?.flatMap(p =>
    (p.competitor_products ?? []).map((cp: { id: string }) => cp.id)
  ) ?? []

  const { data: history } = cpIds.length
    ? await supabase
        .from('price_history')
        .select('*')
        .in('competitor_product_id', cpIds)
        .order('scraped_at', { ascending: false })
        .limit(500)
    : { data: [] }

  // Group history by competitor_product_id
  type HistoryEntry = NonNullable<typeof history>[number]
  const historyByCp: Record<string, HistoryEntry[]> = {}
  for (const h of history ?? []) {
    if (!h.competitor_product_id) continue
    if (!historyByCp[h.competitor_product_id]) historyByCp[h.competitor_product_id] = []
    historyByCp[h.competitor_product_id]!.push(h)
  }

  const liveCompetitorIds = [...new Set(
    products?.flatMap(p =>
      (p.competitor_products ?? [])
        .filter((cp: { status: string }) => cp.status === 'live')
        .map((cp: { competitor_id: string }) => cp.competitor_id)
    ) ?? []
  )]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 className="font-display animate-fade-up" style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.8px', marginBottom: 5 }}>Price History</h1>
          <p className="animate-fade-up delay-100" style={{ fontSize: 13, color: 'var(--text-dim)' }}>Full price timeline for all tracked products</p>
        </div>
        <ClientRefreshButton competitorIds={liveCompetitorIds} />
      </div>

      {(!products || products.length === 0) && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No products yet — price history will appear here once competitors are live.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {products?.map((product, pi) => {
          const cps = (product.competitor_products ?? []) as {
            id: string; competitor_id: string; url: string; status: string; last_price: number | null;
            competitor: { id: string; name: string; domain: string } | null
          }[]

          const competitorTabs = cps.map(cp => ({
            id: cp.id,
            name: cp.competitor?.name ?? 'Unknown',
            domain: cp.competitor?.domain ?? '',
            status: cp.status,
            lastPrice: cp.last_price,
            history: historyByCp[cp.id] ?? [],
          }))

          return (
            <HistoryProductCard
              key={product.id}
              product={{ id: product.id, name: product.name, category: product.category, image_url: product.image_url }}
              competitorTabs={competitorTabs}
              animationDelay={pi * 0.05}
            />
          )
        })}
      </div>
    </div>
  )
}
