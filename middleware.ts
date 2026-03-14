import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow requests to login page and API routes
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login') || pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  // For other routes, you can add your authentication logic here
  // For now, we'll allow all requests to pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!login|api|_next/static|_next/image|favicon.ico).*)'
  ]
}
