import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it } from 'vitest'

describe('external api routes', () => {
  beforeEach(() => {
    process.env.EXTERNAL_API_SECRET = 'test-secret'
    process.env.ENABLE_EXTERNAL_API = 'false'
  })

  it('returns 404 when external work-items api is disabled', async () => {
    const { POST } = await import('@/app/api/external/work-items/route')
    const request = new NextRequest('http://localhost:3000/api/external/work-items', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-secret': 'test-secret',
      },
      body: JSON.stringify({ type: 'Bug', externalId: 1, title: 'Titulo' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
  })

  it('returns 401 when external users api is enabled with invalid secret', async () => {
    process.env.ENABLE_EXTERNAL_API = 'true'

    const { POST } = await import('@/app/api/external/users/route')
    const request = new NextRequest('http://localhost:3000/api/external/users', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-secret': 'invalid-secret',
      },
      body: JSON.stringify({
        email: 'dev@example.com',
        username: 'dev',
        name: 'Dev',
        password: 'secret123',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })
})
