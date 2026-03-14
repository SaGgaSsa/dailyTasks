import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig as any)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Permitir acceso a rutas públicas
  if (pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return // Deja pasar
  }

  // Para rutas protegidas (dashboard, tracklists, analytics), verificar autenticación
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/tracklists') || pathname.startsWith('/analytics')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/auth/login", req.nextUrl))
  }
  
  return // Deja pasar
})

export const config = {
  // Matcher que excluye archivos estáticos y rutas de API internas
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
