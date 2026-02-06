import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Extend globalThis to include prisma property
declare global {
  var prisma: PrismaClient | undefined
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

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
        adapter: new PrismaPg(pool),
      })
    }
    prisma = globalThis.prisma
  } else {
    // Production: create single instance
    prisma = new PrismaClient({
      log: ['error'],
      errorFormat: 'colorless',
      adapter: new PrismaPg(pool),
    })
  }
} else {
  // Client-side: throw error as Prisma should not be used on client
  throw new Error('Prisma client should not be used on the client side')
}

// Export the singleton instance
export const db = prisma
