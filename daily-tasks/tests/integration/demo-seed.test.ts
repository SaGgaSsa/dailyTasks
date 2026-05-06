import { TaskStatus, TicketQAStatus } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import { seedDemoData } from '@/prisma/seed'
import { db } from '@/lib/db'

describe('demo seed data', () => {
  it('creates repeatable navigable demo data without duplicating records', async () => {
    await seedDemoData(db)
    await seedDemoData(db)

    const users = await db.user.findMany({
      where: { email: { in: ['admin@dailytasks.com', 'dev@dailytasks.com', 'qa@dailytasks.com'] } },
      orderBy: { username: 'asc' },
    })
    expect(users.map((user) => user.username)).toEqual(['admin', 'dev', 'qa'])

    const externalWorkItems = await db.externalWorkItem.findMany({
      where: { title: { startsWith: 'Seed demo' } },
      include: { workItemType: true },
      orderBy: { externalId: 'asc' },
    })
    expect(externalWorkItems).toHaveLength(4)
    expect(externalWorkItems.map((item) => item.workItemType.name)).toEqual([
      'I_CASO',
      'I_CONS',
      'I_MODAPL',
      'I_MODAPL',
    ])

    const incidences = await db.incidence.findMany({
      where: { description: { startsWith: 'Seed demo' } },
      include: {
        assignments: {
          include: { user: true, tasks: true },
        },
        scripts: true,
      },
      orderBy: { position: 'asc' },
    })
    expect(incidences).toHaveLength(5)
    expect(incidences.map((incidence) => incidence.status)).toEqual([
      TaskStatus.BACKLOG,
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.REVIEW,
      TaskStatus.DISMISSED,
    ])

    for (const incidence of incidences) {
      expect(incidence.assignments).toHaveLength(1)
      expect(incidence.assignments[0].user.username).toBe('dev')
      expect(incidence.assignments[0].tasks).toHaveLength(2)
      expect(incidence.scripts).toHaveLength(1)
      expect(incidence.scripts[0].type).toBe('SQL')
    }

    const tracklists = await db.tracklist.findMany({
      where: { title: { startsWith: 'Seed demo' } },
      include: {
        createdBy: true,
        externalWorkItems: true,
        tickets: {
          orderBy: { ticketNumber: 'asc' },
        },
      },
    })
    expect(tracklists).toHaveLength(1)
    expect(tracklists[0].createdBy.username).toBe('qa')
    expect(tracklists[0].externalWorkItems).toHaveLength(4)
    expect(tracklists[0].tickets).toHaveLength(5)
    expect(tracklists[0].tickets.map((ticket) => ticket.status)).toEqual([
      TicketQAStatus.NEW,
      TicketQAStatus.ASSIGNED,
      TicketQAStatus.IN_DEVELOPMENT,
      TicketQAStatus.TEST,
      TicketQAStatus.DISMISSED,
    ])
    expect(new Set(tracklists[0].tickets.map((ticket) => ticket.incidenceId))).toHaveProperty('size', 5)
  })
})
