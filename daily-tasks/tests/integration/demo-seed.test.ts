import { describe, expect, it } from 'vitest'

import { db } from '@/lib/db'
import { seedInitialData } from '@/prisma/seed'

const DEMO_PREFIX = 'Seed demo'

async function createLegacyDemoRecords() {
  const dev = await db.user.findUniqueOrThrow({ where: { email: 'dev@dailytasks.com' } })
  const qa = await db.user.findUniqueOrThrow({ where: { email: 'qa@dailytasks.com' } })
  const workItemType = await db.workItemType.findUniqueOrThrow({ where: { name: 'I_MODAPL' } })

  const technology = await db.technology.create({
    data: {
      name: `${DEMO_PREFIX} technology`,
      users: {
        connect: { id: dev.id },
      },
    },
  })
  const moduleRecord = await db.module.create({
    data: {
      name: `${DEMO_PREFIX} module`,
      slug: 'seed-demo-module',
      technologyId: technology.id,
    },
  })
  const externalWorkItem = await db.externalWorkItem.create({
    data: {
      workItemTypeId: workItemType.id,
      externalId: 910003,
      title: `${DEMO_PREFIX} tramite I_MODAPL`,
    },
  })
  const incidence = await db.incidence.create({
    data: {
      externalWorkItemId: externalWorkItem.id,
      description: `${DEMO_PREFIX} incidencia TODO`,
      technologyId: technology.id,
      assignments: {
        create: {
          userId: dev.id,
          tasks: {
            create: {
              title: `${DEMO_PREFIX} tarea`,
            },
          },
        },
      },
      pages: {
        create: {
          title: `${DEMO_PREFIX} pagina`,
          authorId: dev.id,
        },
      },
      scripts: {
        create: {
          type: 'SQL',
          content: `-- ${DEMO_PREFIX} script`,
          createdById: dev.id,
        },
      },
    },
  })
  const tracklist = await db.tracklist.create({
    data: {
      title: `${DEMO_PREFIX} tracklist QA`,
      createdById: qa.id,
      externalWorkItems: {
        connect: { id: externalWorkItem.id },
      },
    },
  })
  const ticket = await db.ticketQA.create({
    data: {
      tracklistId: tracklist.id,
      ticketNumber: 1,
      type: 'BUG',
      moduleId: moduleRecord.id,
      description: `${DEMO_PREFIX} ticket NEW`,
      priority: 'MEDIUM',
      externalWorkItemId: externalWorkItem.id,
      reportedById: qa.id,
      incidenceId: incidence.id,
    },
  })
  const environment = await db.environment.create({
    data: {
      name: `${DEMO_PREFIX} ambiente`,
    },
  })
  await db.environmentLogEntry.create({
    data: {
      environmentId: environment.id,
      ticketId: ticket.id,
      incidenceId: incidence.id,
      createdById: qa.id,
      subject: `${DEMO_PREFIX} log`,
    },
  })
}

describe('initial seed data', () => {
  it('keeps only repeatable base users and work item types while removing legacy demo records', async () => {
    await seedInitialData(db)
    await createLegacyDemoRecords()
    await seedInitialData(db)
    await seedInitialData(db)

    const users = await db.user.findMany({
      where: { email: { in: ['admin@dailytasks.com', 'dev@dailytasks.com', 'qa@dailytasks.com'] } },
      orderBy: { username: 'asc' },
    })
    expect(users.map((user) => ({ email: user.email, username: user.username, role: user.role }))).toEqual([
      { email: 'admin@dailytasks.com', username: 'admin', role: 'ADMIN' },
      { email: 'dev@dailytasks.com', username: 'dev', role: 'DEV' },
      { email: 'qa@dailytasks.com', username: 'qa', role: 'QA' },
    ])

    const workItemTypes = await db.workItemType.findMany({
      where: { name: { in: ['Bug', 'Feature', 'I_CASO', 'I_CONS', 'I_MODAPL'] } },
      orderBy: { name: 'asc' },
    })
    expect(workItemTypes.map((type) => ({ name: type.name, color: type.color }))).toEqual([
      { name: 'Bug', color: 'red' },
      { name: 'Feature', color: 'green' },
      { name: 'I_CASO', color: 'orange' },
      { name: 'I_CONS', color: 'purple' },
      { name: 'I_MODAPL', color: 'blue' },
    ])

    await expect(db.externalWorkItem.count({ where: { title: { startsWith: DEMO_PREFIX } } })).resolves.toBe(0)
    await expect(db.incidence.count({ where: { description: { startsWith: DEMO_PREFIX } } })).resolves.toBe(0)
    await expect(db.tracklist.count({ where: { title: { startsWith: DEMO_PREFIX } } })).resolves.toBe(0)
    await expect(db.ticketQA.count({ where: { description: { startsWith: DEMO_PREFIX } } })).resolves.toBe(0)
    await expect(db.module.count({ where: { slug: 'seed-demo-module' } })).resolves.toBe(0)
    await expect(db.technology.count({ where: { name: `${DEMO_PREFIX} technology` } })).resolves.toBe(0)
  })
})
