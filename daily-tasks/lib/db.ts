import { PrismaClient } from '.prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const { Pool } = require('pg') as {
  Pool: new (config: { connectionString?: string }) => {
    end(): Promise<void>
  }
}

// Extend globalThis to include prisma property
declare global {
  var prisma: PrismaClient | undefined
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool as ConstructorParameters<typeof PrismaPg>[0])

// Singleton instance
let prisma: PrismaClient

// Create the Prisma client instance
if (typeof window === 'undefined') {
  // Server-side: create singleton instance
  if (process.env.NODE_ENV !== 'production') {
    // Development: use globalThis to persist connection during HMR
    if (!globalThis.prisma) {
      globalThis.prisma = new PrismaClient({
        log: ['info', 'warn', 'error'],
        errorFormat: 'pretty',
        adapter,
      })
    }
    prisma = globalThis.prisma
  } else {
    // Production: create single instance
    prisma = new PrismaClient({
      log: ['error'],
      errorFormat: 'colorless',
      adapter,
    })
  }
} else {
  // Client-side: throw error as Prisma should not be used on client
  throw new Error('Prisma client should not be used on the client side')
}

// Export the singleton instance
export const db = prisma
