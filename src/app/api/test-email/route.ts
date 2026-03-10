import { NextResponse } from 'next/server'
import { sendPriceChangeAlert } from '@/lib/email'
import { requireAdmin } from '@/lib/auth'

export async function POST() {
  await requireAdmin()

  const fakeRule = {
    id: 'test',
    user_id: 'test',
    product_id: 'test',
    competitor_product_id: 'test',
    trigger: 'drops_by' as const,
    threshold: 2.04,
    email: process.env.ADMIN_EMAIL!,
    is_active: true,
    created_at: new Date().toISOString(),
  }

  await sendPriceChangeAlert({
    competitorName: 'Panel World',
    competitorDomain: 'panelworld.co.uk',
    productName: 'Strivo Black Oak Acoustic Slat Panel',
    productCategory: 'Acoustics',
    productImageUrl: null,
    alertRule: fakeRule,
    oldPrice: 32.95,
    newPrice: 30.91,
  })

  return NextResponse.json({ success: true, sentTo: process.env.ADMIN_EMAIL })
}
