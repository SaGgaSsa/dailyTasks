import { describe, expect, it } from 'vitest'
import { TaskStatus, TicketQAStatus, TicketType } from '@prisma/client'

import { rejectTicket } from '@/app/actions/incidence-actions'
import { db } from '@/lib/db'
import {
  actAs,
  createExternalWorkItem,
  createIncidenceFixture,
  createTechnologyModule,
  createTicketFixture,
  createTracklist,
  createUser,
} from '@/tests/integration/helpers'

describe('ticket rejection automation integration', () => {
  it('creates a new QA task and returns the flow to development', async () => {
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const { incidence, assignments } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.REVIEW,
      estimatedTime: 2,
      assignees: [{ userId: dev.id, assignedHours: 2 }],
      tasks: [{ userId: dev.id, title: 'Implementado', isCompleted: true }],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.TEST,
      type: TicketType.BUG,
      description: 'Bug a revisar',
    })

    const longDescription = 'x'.repeat(140)

    actAs(qa)
    const result = await rejectTicket({
      ticketId: ticket.id,
      tracklistId: tracklist.id,
      description: longDescription,
      observations: 'Falla todavia en QA',
    })

    expect(result.success).toBe(true)

    const updatedIncidence = await db.incidence.findUniqueOrThrow({
      where: { id: incidence.id },
    })
    const updatedTicket = await db.ticketQA.findUniqueOrThrow({
      where: { id: ticket.id },
    })
    const assignment = assignments.get(dev.id)!
    const tasks = await db.task.findMany({
      where: { assignmentId: assignment.id },
      orderBy: { id: 'asc' },
    })

    expect(updatedIncidence.status).toBe(TaskStatus.IN_PROGRESS)
    expect(updatedTicket.status).toBe(TicketQAStatus.IN_DEVELOPMENT)
    expect(tasks).toHaveLength(2)
    expect(tasks[1]?.isQaReported).toBe(true)
    expect(tasks[1]?.isCompleted).toBe(false)
    expect(tasks[1]?.description).toBe('Falla todavia en QA')
    expect(tasks[1]?.title).toHaveLength(120)
    expect(tasks[1]?.title.endsWith('...')).toBe(true)
  })
})
