import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth cookie — Supabase sets this automatically
  const hasSession = request.cookies.has('sb-access-token') || 
    [...request.cookies.getAll().map(c => c.name)].some(name => name.startsWith('sb-') && name.endsWith('-auth-token'))

  // Protect dashboard and admin routes
  if (!hasSession && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users away from login
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
