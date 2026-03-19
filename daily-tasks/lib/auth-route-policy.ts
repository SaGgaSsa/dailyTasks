import { isExternalApiEnabled } from './external-api'

const PUBLIC_API_PREFIXES = ['/api/auth']
const PUBLIC_PAGE_PREFIXES = ['/auth', '/_next']
const PUBLIC_EXACT_PATHS = new Set(['/', '/favicon.ico'])

export function isPublicApiPath(pathname: string): boolean {
  if (pathname.startsWith('/api/external')) {
    return isExternalApiEnabled()
  }

  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true
  }

  return (
    isPublicApiPath(pathname) ||
    PUBLIC_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}
