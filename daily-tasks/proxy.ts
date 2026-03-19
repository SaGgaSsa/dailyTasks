import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from './auth.config'
import { isPublicPath } from './lib/auth-route-policy'
import { externalApiDisabledResponse, isExternalApiEnabled, isExternalApiPath } from './lib/external-api'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  if (isExternalApiPath(pathname)) {
    if (!isExternalApiEnabled()) {
      return externalApiDisabledResponse()
    }

    return
  }

  if (isPublicPath(pathname)) {
    return
  }

  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    return NextResponse.redirect(new URL('/auth/login', req.nextUrl))
  }

  return
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
