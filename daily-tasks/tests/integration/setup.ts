import { UserRole } from '@prisma/client'
import { afterAll, beforeAll, beforeEach, vi } from 'vitest'

const databaseUrlTest = process.env.DATABASE_URL_TEST

if (!databaseUrlTest) {
  throw new Error('DATABASE_URL_TEST is required for integration tests')
}

process.env.DATABASE_URL = databaseUrlTest
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'integration-test-secret'
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
process.env.ENABLE_EXTERNAL_API = process.env.ENABLE_EXTERNAL_API || 'false'

export type MockSession = {
  user: {
    id: string
    email: string
    name: string
    username: string
    role: UserRole
    mustChangePassword?: boolean
  }
} | null

let currentSession: MockSession = null

export const revalidatePathMock = vi.fn()
export const revalidateTagMock = vi.fn()
const cacheStore = new Map<string, unknown>()
const cacheTags = new Map<string, string[]>()

vi.mock('@/auth', () => ({
  auth: vi.fn(async () => currentSession),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
  revalidateTag: (tag: string, profile?: string) => {
    revalidateTagMock(tag, profile)
    for (const [cacheKey, tags] of cacheTags.entries()) {
      if (tags.includes(tag)) {
        cacheStore.delete(cacheKey)
      }
    }
  },
  unstable_cache: <T extends (...args: never[]) => Promise<unknown>>(
    callback: T,
    keyParts: string[] = [],
    options: { tags?: string[] } = {}
  ) => {
    return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      const cacheKey = JSON.stringify([keyParts, args])
      if (!cacheStore.has(cacheKey)) {
        cacheStore.set(cacheKey, await callback(...args))
        cacheTags.set(cacheKey, options.tags ?? [])
      }

      return cacheStore.get(cacheKey) as Awaited<ReturnType<T>>
    }) as T
  },
}))

export function setMockSession(session: MockSession) {
  currentSession = session
}

export function clearMockSession() {
  currentSession = null
}

beforeAll(async () => {
  const { db } = await import('@/lib/db')
  await db.$connect()
})

beforeEach(async () => {
  clearMockSession()
  revalidatePathMock.mockClear()
  revalidateTagMock.mockClear()
  cacheStore.clear()
  cacheTags.clear()

  const { db } = await import('@/lib/db')
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "user_environment_favorites",
      "environment_log_entries",
      "tickets_qa",
      "tasks",
      "assignments",
      "incidence_pages",
      "incidences",
      "tracklists",
      "attachments",
      "external_work_items",
      "environments",
      "modules",
      "technologies",
      "users",
      "non_working_days"
    RESTART IDENTITY CASCADE
  `)
})

afterAll(async () => {
  clearMockSession()
  const { db } = await import('@/lib/db')
  await db.$disconnect()
})
