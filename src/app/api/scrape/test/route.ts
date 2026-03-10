import { NextRequest, NextResponse } from 'next/server'
import { testScrape } from '@/lib/scraper'
import { getProfile } from '@/lib/auth'

async function checkAdmin() {
  const profile = await getProfile()
  if (!profile || profile.role !== 'admin') return null
  return profile
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { url, sale_price_selector, price_selector } = await req.json()

  if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 })
  if (!sale_price_selector && !price_selector) return NextResponse.json({ error: 'At least one selector is required' }, { status: 400 })

  const result = await testScrape(url, sale_price_selector ?? null, price_selector ?? null)
  return NextResponse.json(result)
}
