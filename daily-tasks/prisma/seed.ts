import { PrismaClient, type Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool as ConstructorParameters<typeof PrismaPg>[0])
const prisma = new PrismaClient({ adapter })
const DEFAULT_SEED_PASSWORD = '12345678'
const DEMO_PREFIX = 'Seed demo'

type SeedClient = PrismaClient | Prisma.TransactionClient

const workItemTypeSeeds = [
  { name: 'Bug', color: 'red' },
  { name: 'Feature', color: 'green' },
  { name: 'I_CASO', color: 'orange' },
  { name: 'I_CONS', color: 'purple' },
  { name: 'I_MODAPL', color: 'blue' },
] as const

const userSeeds = [
  { email: 'admin@dailytasks.com', username: 'admin', role: 'ADMIN' },
  { email: 'dev@dailytasks.com', username: 'dev', role: 'DEV' },
  { email: 'qa@dailytasks.com', username: 'qa', role: 'QA' },
] as const

async function seedBaseData(client: SeedClient) {
  for (const workItemType of workItemTypeSeeds) {
    await client.workItemType.upsert({
      where: { name: workItemType.name },
      update: { color: workItemType.color },
      create: workItemType,
    })
  }

  const seedPassword = process.env.SEED_USER_PASSWORD?.trim() || DEFAULT_SEED_PASSWORD
  const hashedPassword = await bcrypt.hash(seedPassword, 10)

  for (const user of userSeeds) {
    await client.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        username: user.username,
        role: user.role,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        username: user.username,
        role: user.role,
      },
    })
  }
}

async function cleanupDemoData(client: SeedClient) {
  await client.environmentLogEntry.deleteMany({
    where: {
      OR: [
        { subject: { startsWith: DEMO_PREFIX } },
        { body: { startsWith: DEMO_PREFIX } },
        { incidence: { description: { startsWith: DEMO_PREFIX } } },
        { incidence: { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } } },
        { ticket: { description: { startsWith: DEMO_PREFIX } } },
        { ticket: { tracklist: { title: { startsWith: DEMO_PREFIX } } } },
        { ticket: { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } } },
        { ticket: { module: { slug: 'seed-demo-module' } } },
      ],
    },
  })

  await client.ticketQA.deleteMany({
    where: {
      OR: [
        { description: { startsWith: DEMO_PREFIX } },
        { tracklist: { title: { startsWith: DEMO_PREFIX } } },
        { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } },
        { incidence: { description: { startsWith: DEMO_PREFIX } } },
        { incidence: { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } } },
        { module: { slug: 'seed-demo-module' } },
      ],
    },
  })

  await client.tracklist.deleteMany({
    where: { title: { startsWith: DEMO_PREFIX } },
  })

  await client.script.deleteMany({
    where: {
      OR: [
        { content: { startsWith: `-- ${DEMO_PREFIX}` } },
        { incidence: { description: { startsWith: DEMO_PREFIX } } },
        { incidence: { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } } },
      ],
    },
  })

  await client.task.deleteMany({
    where: {
      OR: [
        { title: { startsWith: DEMO_PREFIX } },
        { assignment: { incidence: { description: { startsWith: DEMO_PREFIX } } } },
        { assignment: { incidence: { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } } } },
      ],
    },
  })

  await client.assignment.deleteMany({
    where: {
      OR: [
        { incidence: { description: { startsWith: DEMO_PREFIX } } },
        { incidence: { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } } },
      ],
    },
  })

  await client.incidencePage.deleteMany({
    where: {
      OR: [
        { title: { startsWith: DEMO_PREFIX } },
        { incidence: { description: { startsWith: DEMO_PREFIX } } },
        { incidence: { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } } },
      ],
    },
  })

  await client.incidence.deleteMany({
    where: {
      OR: [
        { description: { startsWith: DEMO_PREFIX } },
        { externalWorkItem: { title: { startsWith: DEMO_PREFIX } } },
        { technology: { name: `${DEMO_PREFIX} technology` } },
      ],
    },
  })

  await client.externalWorkItem.deleteMany({
    where: { title: { startsWith: DEMO_PREFIX } },
  })

  await client.module.deleteMany({
    where: {
      OR: [{ slug: 'seed-demo-module' }, { name: { startsWith: DEMO_PREFIX } }],
    },
  })

  await client.technology.deleteMany({
    where: { name: `${DEMO_PREFIX} technology` },
  })
}

export async function seedInitialData(client: PrismaClient = prisma) {
  await client.$transaction(
    async (tx: Prisma.TransactionClient) => {
      await cleanupDemoData(tx)
      await seedBaseData(tx)
    },
    {
      maxWait: 15_000,
      timeout: 30_000,
    }
  )
}

async function main() {
  await seedInitialData(prisma)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
      await pool.end()
    })
}
