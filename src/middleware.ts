import { NextResponse, type NextRequest } from 'next/server'

// Minimal middleware - auth is handled by individual pages via requireAuth()/requireAdmin()
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
