import { NextResponse } from 'next/server'

export function isExternalApiEnabled(): boolean {
  return process.env.ENABLE_EXTERNAL_API === 'true'
}

export function isExternalApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/external')
}

export function validateExternalApiSecret(secret: string | null): boolean {
  return !!secret && secret === process.env.EXTERNAL_API_SECRET
}

export function externalApiDisabledResponse() {
  return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
}

export function externalApiUnauthorizedResponse() {
  return NextResponse.json({ success: false, error: 'Credenciales inválidas' }, { status: 401 })
}
