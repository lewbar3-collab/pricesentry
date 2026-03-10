import type { AlertRule } from '@/types'
import type { createAdminClient } from '@/lib/supabase/server'

export async function processAlerts(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  cp: {
    id: string
    product_id: string
    competitor?: { name: string; domain: string } | null
    product?: { id: string; user_id: string; name: string; category?: string | null; image_url?: string | null } | null
  },
  oldPrice: number,
  newPrice: number
): Promise<number> {
  const changeAmount = newPrice - oldPrice

  const { data: rules } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('competitor_product_id', cp.id)
    .eq('is_active', true)

  if (!rules?.length) return 0
  let alertsSent = 0

  for (const rule of rules as AlertRule[]) {
    let shouldAlert = false
    switch (rule.trigger) {
      case 'any_change':   shouldAlert = true; break
      case 'drops_by':     shouldAlert = changeAmount < 0 && Math.abs(changeAmount) >= (rule.threshold ?? 0); break
      case 'rises_above':  shouldAlert = changeAmount > 0 && changeAmount >= (rule.threshold ?? 0); break
      case 'below_price':  shouldAlert = newPrice < (rule.threshold ?? 0); break
      case 'above_price':  shouldAlert = newPrice > (rule.threshold ?? 0); break
    }

    if (shouldAlert) {
      try {
        const { sendPriceChangeAlert } = await import('@/lib/email')
        await sendPriceChangeAlert({
          competitorName:     cp.competitor?.name     ?? 'Unknown Competitor',
          competitorDomain:   cp.competitor?.domain   ?? '',
          productName:        cp.product?.name        ?? 'Unknown Product',
          productCategory:    cp.product?.category    ?? null,
          productImageUrl:    cp.product?.image_url   ?? null,
          alertRule: rule,
          oldPrice,
          newPrice,
        })
        await supabase.from('alert_logs').insert({
          alert_rule_id:  rule.id,
          product_id:     cp.product_id,
          old_price:      oldPrice,
          new_price:      newPrice,
          change_amount:  changeAmount,
          change_percent: ((changeAmount / oldPrice) * 100),
          email_sent:     true,
        })
        alertsSent++
      } catch { /* email failed silently */ }
    }
  }
  return alertsSent
}
