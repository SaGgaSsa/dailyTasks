import {
  PrismaClient,
  ScriptType,
  TaskStatus,
  TicketQAStatus,
  type Prisma,
} from '@prisma/client'
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

const demoWorkItems = [
  { type: 'I_CASO', externalId: 910001, title: `${DEMO_PREFIX} tramite I_CASO` },
  { type: 'I_CONS', externalId: 910002, title: `${DEMO_PREFIX} tramite I_CONS` },
  { type: 'I_MODAPL', externalId: 910003, title: `${DEMO_PREFIX} tramite I_MODAPL 1` },
  { type: 'I_MODAPL', externalId: 910004, title: `${DEMO_PREFIX} tramite I_MODAPL 2` },
] as const

const demoIncidenceStatuses = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.REVIEW,
  TaskStatus.DISMISSED,
] as const

const demoTicketStatuses = [
  TicketQAStatus.NEW,
  TicketQAStatus.ASSIGNED,
  TicketQAStatus.IN_DEVELOPMENT,
  TicketQAStatus.TEST,
  TicketQAStatus.DISMISSED,
] as const

async function seedBaseData(client: SeedClient) {
  for (const workItemType of workItemTypeSeeds) {
    await client.workItemType.upsert({
      where: { name: workItemType.name },
      update: {},
      create: workItemType,
    })
  }

  const seedPassword = process.env.SEED_USER_PASSWORD?.trim() || DEFAULT_SEED_PASSWORD
  const hashedPassword = await bcrypt.hash(seedPassword, 10)

  const admin = await client.user.upsert({
    where: { email: 'admin@dailytasks.com' },
    update: {},
    create: {
      email: 'admin@dailytasks.com',
      password: hashedPassword,
      username: 'admin',
      role: 'ADMIN',
    },
  })

  const dev = await client.user.upsert({
    where: { email: 'dev@dailytasks.com' },
    update: {},
    create: {
      email: 'dev@dailytasks.com',
      password: hashedPassword,
      username: 'dev',
      role: 'DEV',
    },
  })

  const qa = await client.user.upsert({
    where: { email: 'qa@dailytasks.com' },
    update: {},
    create: {
      email: 'qa@dailytasks.com',
      password: hashedPassword,
      username: 'qa',
      role: 'QA',
    },
  })

  const technology = await client.technology.upsert({
    where: { name: `${DEMO_PREFIX} technology` },
    update: {},
    create: {
      name: `${DEMO_PREFIX} technology`,
      isDefault: false,
      users: {
        connect: { id: dev.id },
      },
    },
  })

  const module = await client.module.upsert({
    where: { slug: 'seed-demo-module' },
    update: {
      technologyId: technology.id,
    },
    create: {
      name: `${DEMO_PREFIX} module`,
      slug: 'seed-demo-module',
      technologyId: technology.id,
      isDefault: false,
    },
  })

  return { admin, dev, qa, technology, module }
}

async function cleanupDemoData(client: SeedClient) {
  await client.environmentLogEntry.deleteMany({
    where: {
      OR: [
        { incidence: { description: { startsWith: DEMO_PREFIX } } },
        { ticket: { description: { startsWith: DEMO_PREFIX } } },
      ],
    },
  })

  await client.ticketQA.deleteMany({
    where: {
      OR: [
        { description: { startsWith: DEMO_PREFIX } },
        { tracklist: { title: { startsWith: DEMO_PREFIX } } },
      ],
    },
  })

  await client.tracklist.deleteMany({
    where: { title: { startsWith: DEMO_PREFIX } },
  })

  await client.script.deleteMany({
    where: { incidence: { description: { startsWith: DEMO_PREFIX } } },
  })

  await client.task.deleteMany({
    where: {
      OR: [
        { title: { startsWith: DEMO_PREFIX } },
        { assignment: { incidence: { description: { startsWith: DEMO_PREFIX } } } },
      ],
    },
  })

  await client.assignment.deleteMany({
    where: { incidence: { description: { startsWith: DEMO_PREFIX } } },
  })

  await client.incidencePage.deleteMany({
    where: { incidence: { description: { startsWith: DEMO_PREFIX } } },
  })

  await client.incidence.deleteMany({
    where: { description: { startsWith: DEMO_PREFIX } },
  })
}

async function seedDemoWorkItems(client: SeedClient) {
  const workItems = []

  for (const demoWorkItem of demoWorkItems) {
    const workItemType = await client.workItemType.findUniqueOrThrow({
      where: { name: demoWorkItem.type },
    })

    const workItem = await client.externalWorkItem.upsert({
      where: {
        workItemTypeId_externalId: {
          workItemTypeId: workItemType.id,
          externalId: demoWorkItem.externalId,
        },
      },
      update: {
        title: demoWorkItem.title,
        status: 'ACTIVE',
      },
      create: {
        workItemTypeId: workItemType.id,
        externalId: demoWorkItem.externalId,
        title: demoWorkItem.title,
        status: 'ACTIVE',
      },
    })

    workItems.push(workItem)
  }

  return workItems
}

function getIncidenceDates(status: TaskStatus) {
  const startedAt = new Date('2026-01-10T10:00:00.000Z')

  if (status === TaskStatus.BACKLOG) {
    return {
      startedAt: null,
      readyForDeployAt: null,
      completedAt: null,
    }
  }

  return {
    startedAt,
    readyForDeployAt: status === TaskStatus.REVIEW ? new Date('2026-01-12T10:00:00.000Z') : null,
    completedAt: null,
  }
}

async function seedDemoIncidences(
  client: SeedClient,
  input: {
    devId: number
    technologyId: number
    externalWorkItemIds: number[]
  }
) {
  const incidences = []

  for (const [index, status] of demoIncidenceStatuses.entries()) {
    const incidence = await client.incidence.create({
      data: {
        externalWorkItemId: input.externalWorkItemIds[index % input.externalWorkItemIds.length],
        description: `${DEMO_PREFIX} incidencia ${status}`,
        comment: `${DEMO_PREFIX} comentario generico ${status}`,
        status,
        priority: index === 0 ? 'LOW' : index === 4 ? 'HIGH' : 'MEDIUM',
        technologyId: input.technologyId,
        estimatedTime: 4 + index,
        position: index + 1,
        ...getIncidenceDates(status),
        assignments: {
          create: {
            userId: input.devId,
            assignedHours: 4 + index,
            isAssigned: true,
            tasks: {
              create: [
                {
                  title: `${DEMO_PREFIX} tarea 1 ${status}`,
                  description: `${DEMO_PREFIX} tarea generica 1`,
                },
                {
                  title: `${DEMO_PREFIX} tarea 2 ${status}`,
                  description: `${DEMO_PREFIX} tarea generica 2`,
                },
              ],
            },
          },
        },
        scripts: {
          create: {
            type: ScriptType.SQL,
            content: `-- ${DEMO_PREFIX} script ${status}\nselect '${status}' as demo_status;`,
            createdById: input.devId,
          },
        },
      },
    })

    incidences.push(incidence)
  }

  return incidences
}

async function seedDemoTracklistAndTickets(
  client: SeedClient,
  input: {
    qaId: number
    devId: number
    moduleId: number
    externalWorkItems: Array<{ id: number }>
    incidences: Array<{ id: number }>
  }
) {
  const tracklist = await client.tracklist.create({
    data: {
      title: `${DEMO_PREFIX} tracklist QA`,
      description: `${DEMO_PREFIX} tracklist activa para pruebas`,
      dueDate: new Date('2026-01-31T00:00:00.000Z'),
      status: 'ACTIVE',
      createdById: input.qaId,
      externalWorkItems: {
        connect: input.externalWorkItems.map((workItem) => ({ id: workItem.id })),
      },
    },
  })

  for (const [index, status] of demoTicketStatuses.entries()) {
    await client.ticketQA.create({
      data: {
        tracklistId: tracklist.id,
        ticketNumber: index + 1,
        type: index === 2 ? 'CAMBIO' : index === 3 ? 'CONSULTA' : 'BUG',
        moduleId: input.moduleId,
        description: `${DEMO_PREFIX} ticket ${status}`,
        priority: index === 4 ? 'HIGH' : 'MEDIUM',
        externalWorkItemId: input.externalWorkItems[index % input.externalWorkItems.length].id,
        reportedById: input.qaId,
        assignedToId: status === TicketQAStatus.NEW ? null : input.devId,
        incidenceId: input.incidences[index].id,
        status,
        dismissReason: status === TicketQAStatus.DISMISSED ? `${DEMO_PREFIX} motivo desestimado` : null,
        dismissedById: status === TicketQAStatus.DISMISSED ? input.qaId : null,
        logs: `${DEMO_PREFIX} logs genericos ${status}`,
        observations: `${DEMO_PREFIX} observaciones ${status}`,
      },
    })
  }

  return tracklist
}

export async function seedDemoData(client: PrismaClient = prisma) {
  await client.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const baseData = await seedBaseData(tx)

      await cleanupDemoData(tx)

      const externalWorkItems = await seedDemoWorkItems(tx)
      const incidences = await seedDemoIncidences(tx, {
        devId: baseData.dev.id,
        technologyId: baseData.technology.id,
        externalWorkItemIds: externalWorkItems.map((workItem) => workItem.id),
      })

      await seedDemoTracklistAndTickets(tx, {
        qaId: baseData.qa.id,
        devId: baseData.dev.id,
        moduleId: baseData.module.id,
        externalWorkItems,
        incidences,
      })
    },
    {
      maxWait: 15_000,
      timeout: 30_000,
    }
  )
}

async function main() {
  await seedDemoData(prisma)
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
