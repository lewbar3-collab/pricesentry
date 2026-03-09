import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  await requireAdmin()
  const { user_id } = await req.json()

  const res = NextResponse.json({ success: true })

  if (user_id) {
    res.cookies.set('impersonate_user_id', user_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })
  } else {
    res.cookies.delete('impersonate_user_id')
  }

  return res
}
