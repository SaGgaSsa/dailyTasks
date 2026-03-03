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

  // Para rutas protegidas (dashboard), verificar autenticación
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/auth/login", req.nextUrl))
  }
  
  // Redirección de tracklists al último visitado
  if (pathname === '/dashboard/tracklists') {
    // Si viene con ?invalid=1, borrar cookie y redirigir limpio
    if (req.nextUrl.searchParams.get('invalid') === '1') {
      const response = NextResponse.redirect(new URL('/dashboard/tracklists', req.nextUrl))
      response.cookies.delete('last_tracklist_id')
      return response
    }

    const lastTracklistId = req.cookies.get('last_tracklist_id')?.value

    if (lastTracklistId) {
      return NextResponse.redirect(new URL(`/dashboard/tracklists/${lastTracklistId}`, req.nextUrl))
    }
  }
  
  // Actualizar cookie cuando visita un tracklist específico
  const tracklistMatch = pathname.match(/^\/dashboard\/tracklists\/(\d+)$/)
  if (tracklistMatch) {
    const tracklistId = tracklistMatch[1]
    const response = NextResponse.next()
    response.cookies.set('last_tracklist_id', tracklistId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    })
    return response
  }
  
  return // Deja pasar
})

export const config = {
  // Matcher que excluye archivos estáticos y rutas de API internas
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
