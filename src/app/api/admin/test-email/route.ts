import { NextRequest, NextResponse } from 'next/server'
import { sendPriceChangeAlert } from '@/lib/email'
import { getProfile } from '@/lib/auth'


async function checkAdmin() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') return null
  return profile
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const toEmail = body.to || process.env.ADMIN_EMAIL

  if (!toEmail) {
    return NextResponse.json(
      { error: 'No email — pass { "to": "your@email.com" } in the body, or set ADMIN_EMAIL in Vercel env vars' },
      { status: 400 }
    )
  }

  const fakeRule = {
    id: 'test',
    user_id: 'test',
    product_id: 'test',
    competitor_product_id: 'test',
    trigger: 'drops_by' as const,
    threshold: 2.04,
    email: toEmail,
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

  return NextResponse.json({ success: true, sentTo: toEmail })
}
