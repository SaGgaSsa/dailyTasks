import { describe, expect, it } from 'vitest'
import { TaskStatus, TicketQAStatus } from '@prisma/client'

import { deferIncidence, getIncidences, resumeDeferredIncidence } from '@/app/actions/incidence-actions'
import { db } from '@/lib/db'
import { computeGanttDates } from '@/lib/gantt-utils'
import {
  actAs,
  createExternalWorkItem,
  createIncidenceFixture,
  createTechnologyModule,
  createTicketFixture,
  createTracklist,
  createUser,
  getIncidenceState,
  getTicketState,
} from '@/tests/integration/helpers'

async function createDeferredReadyFixture(status: TaskStatus = TaskStatus.TODO) {
  const admin = await createUser('ADMIN')
  const dev = await createUser('DEV')
  const qa = await createUser('QA')
  const { technology, module: moduleRecord } = await createTechnologyModule()
  const workItem = await createExternalWorkItem()
  const tracklist = await createTracklist(qa.id)
  const { incidence } = await createIncidenceFixture({
    technologyId: technology.id,
    externalWorkItemId: workItem.id,
    status,
    estimatedTime: 8,
    startedAt: new Date('2026-05-01T10:00:00.000Z'),
    assignees: [{ userId: dev.id, assignedHours: 8 }],
    tasks: status === TaskStatus.IN_PROGRESS
      ? [{ userId: dev.id, title: 'Pendiente', isCompleted: false }]
      : [],
  })
  const ticket = await createTicketFixture({
    tracklistId: tracklist.id,
    moduleId: moduleRecord.id,
    reportedById: qa.id,
    assignedToId: dev.id,
    incidenceId: incidence.id,
    externalWorkItemId: workItem.id,
    status: TicketQAStatus.IN_DEVELOPMENT,
  })

  return { admin, dev, incidence, ticket }
}

describe('incidence defer integration', () => {
  it('requires an admin and a reason to defer an active incidence', async () => {
    const { dev, incidence } = await createDeferredReadyFixture()

    actAs(dev)
    await expect(deferIncidence(incidence.id, 'Pausa solicitada')).resolves.toMatchObject({
      success: false,
      error: expect.any(String),
    })

    const admin = await createUser('ADMIN')
    actAs(admin)
    await expect(deferIncidence(incidence.id, '   ')).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('motivo'),
    })
  })

  it('defers TODO and IN_PROGRESS incidences and linked active tickets', async () => {
    const { admin, incidence, ticket } = await createDeferredReadyFixture(TaskStatus.IN_PROGRESS)

    actAs(admin)
    const result = await deferIncidence(incidence.id, 'Esperando definición funcional')

    expect(result.success).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe('DEFERRED')
    expect(updatedIncidence.deferredAt).toBeInstanceOf(Date)
    expect(updatedIncidence.deferredReason).toBe('Esperando definición funcional')
    expect(updatedIncidence.deferredById).toBe(admin.id)
    expect(updatedTicket.status).toBe('DEFERRED')
  })

  it('does not alter a terminal linked ticket when deferring the incidence', async () => {
    const { admin, incidence, ticket } = await createDeferredReadyFixture(TaskStatus.TODO)
    await db.ticketQA.update({ where: { id: ticket.id }, data: { status: TicketQAStatus.COMPLETED } })

    actAs(admin)
    const result = await deferIncidence(incidence.id, 'Sin ventana de deploy')

    expect(result.success).toBe(true)

    const updatedTicket = await getTicketState(ticket.id)
    expect(updatedTicket.status).toBe(TicketQAStatus.COMPLETED)
  })

  it.each([TaskStatus.BACKLOG, TaskStatus.REVIEW, TaskStatus.DONE, TaskStatus.DISMISSED])(
    'does not defer %s incidences',
    async (status) => {
      const { admin, incidence } = await createDeferredReadyFixture(TaskStatus.TODO)
      await db.incidence.update({ where: { id: incidence.id }, data: { status } })

      actAs(admin)
      const result = await deferIncidence(incidence.id, 'Fuera de flujo')

      expect(result.success).toBe(false)
    }
  )

  it('resumes a deferred incidence by recalculating status and ticket state from current data', async () => {
    const { admin, incidence, ticket } = await createDeferredReadyFixture(TaskStatus.IN_PROGRESS)

    actAs(admin)
    await deferIncidence(incidence.id, 'Pausada')
    await db.task.updateMany({
      where: { assignment: { incidenceId: incidence.id } },
      data: { isCompleted: true, completedAt: new Date('2026-05-02T10:00:00.000Z') },
    })

    const result = await resumeDeferredIncidence(incidence.id)

    expect(result.success).toBe(true)

    const updatedIncidence = await getIncidenceState(incidence.id)
    const updatedTicket = await getTicketState(ticket.id)

    expect(updatedIncidence.status).toBe(TaskStatus.REVIEW)
    expect(updatedIncidence.deferredAt).toBeNull()
    expect(updatedIncidence.deferredReason).toBeNull()
    expect(updatedIncidence.deferredById).toBeNull()
    expect(updatedTicket.status).toBe(TicketQAStatus.TEST)
  }, 10000)

  it('hides deferred incidences from default lists and shows them with the explicit status filter', async () => {
    const { admin, incidence } = await createDeferredReadyFixture(TaskStatus.TODO)

    actAs(admin)
    await deferIncidence(incidence.id, 'No entra en el sprint')

    const defaultResult = await getIncidences({ viewType: 'BACKLOG' })
    const deferredResult = await getIncidences({ viewType: 'BACKLOG', status: 'DEFERRED' })

    expect(defaultResult.data.map((item) => item.id)).not.toContain(incidence.id)
    expect(deferredResult.data.map((item) => item.id)).toContain(incidence.id)
  })

  it('uses deferredAt as the visual end date for deferred Gantt bars', () => {
    const startedAt = new Date('2026-05-04T09:00:00.000Z')
    const deferredAt = new Date('2026-05-05T15:00:00.000Z')

    const dates = computeGanttDates({
      startedAt,
      completedAt: null,
      deferredAt,
      estimatedTime: 40,
      ticketCreatedAt: startedAt,
    })

    expect(dates.startDate).toEqual(startedAt)
    expect(dates.endDate).toEqual(deferredAt)
    expect(dates.isEstimated).toBe(false)
  })
})
