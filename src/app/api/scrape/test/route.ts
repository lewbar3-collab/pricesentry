import { NextRequest, NextResponse } from 'next/server'
import { testScrape } from '@/lib/scraper'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  await requireAdmin()

  const { url, selector } = await req.json()

  if (!url || !selector) {
    return NextResponse.json({ error: 'url and selector are required' }, { status: 400 })
  }

  const result = await testScrape(url, selector)
  return NextResponse.json(result)
}
