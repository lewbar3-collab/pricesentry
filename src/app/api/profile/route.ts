import { NextResponse } from 'next/server'
import { requireClient } from '@/lib/auth'

export async function GET() {
  const profile = await requireClient()
  return NextResponse.json({
    email: profile.email,
    full_name: profile.full_name,
    company_name: profile.company_name,
    plan: profile.plan,
  })
}
