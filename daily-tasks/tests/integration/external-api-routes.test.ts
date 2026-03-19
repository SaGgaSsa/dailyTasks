import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { ExternalWorkItemStatus, UserRole } from '@prisma/client'

import { createExternalWorkItem, createTechnologyModule, createUser } from '@/tests/integration/helpers'

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

  it('rejects invalid attachment links when creating incidences from the external api', async () => {
    process.env.ENABLE_EXTERNAL_API = 'true'

    const { technology } = await createTechnologyModule()
    const uploader = await createUser(UserRole.DEV)
    const workItem = await createExternalWorkItem()

    const { POST } = await import('@/app/api/external/incidences/route')
    const request = new NextRequest('http://localhost:3000/api/external/incidences', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-secret': 'test-secret',
      },
      body: JSON.stringify({
        type: 'I_MODAPL',
        externalId: workItem.externalId,
        title: 'Incidencia externa',
        technology: technology.name,
        username: uploader.username,
        files: [{ name: 'invalido', url: 'javascript:alert(1)' }],
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Uno o más enlaces adjuntos no son válidos')
  })

  it('rejects inactive external work items in external incidence ingestion', async () => {
    process.env.ENABLE_EXTERNAL_API = 'true'

    const { technology } = await createTechnologyModule()
    const uploader = await createUser(UserRole.DEV)
    const workItem = await createExternalWorkItem('I_MODAPL', ExternalWorkItemStatus.INACTIVE)

    const { POST } = await import('@/app/api/external/incidences/route')
    const request = new NextRequest('http://localhost:3000/api/external/incidences', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-secret': 'test-secret',
      },
      body: JSON.stringify({
        type: 'I_MODAPL',
        externalId: workItem.externalId,
        title: 'Incidencia externa',
        technology: technology.name,
        username: uploader.username,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toBe('No se puede usar un trámite externo inactivo')
  })
})
