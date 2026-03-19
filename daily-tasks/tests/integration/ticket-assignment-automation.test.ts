import { describe, expect, it } from 'vitest'
import { TaskStatus, TicketQAStatus } from '@prisma/client'

import { createTicket, updateTicket } from '@/app/actions/tracklists'
import { db } from '@/lib/db'
import { Priority, TicketType } from '@/types/enums'
import {
  actAs,
  createExternalWorkItem,
  createTechnologyModule,
  createTracklist,
  createUser,
} from '@/tests/integration/helpers'

describe('ticket assignment automation integration', () => {
  it('creates an incidence automatically when creating a ticket with assignee', async () => {
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const { module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)

    actAs(qa)
    const result = await createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: moduleRecord.id,
      description: 'Error en produccion',
      priority: Priority.HIGH,
      externalWorkItemId: workItem.id,
      assignedToId: dev.id,
      observations: 'Detalle',
    })

    expect(result.success).toBe(true)

    const createdTicket = await db.ticketQA.findFirstOrThrow({
      where: { tracklistId: tracklist.id },
      include: {
        incidence: {
          include: {
            assignments: true,
            pages: true,
          },
        },
      },
    })

    expect(createdTicket.status).toBe(TicketQAStatus.ASSIGNED)
    expect(createdTicket.incidenceId).not.toBeNull()
    expect(createdTicket.assignedToId).toBe(dev.id)
    expect(createdTicket.incidence?.status).toBe(TaskStatus.BACKLOG)
    expect(createdTicket.incidence?.assignments).toHaveLength(1)
    expect(createdTicket.incidence?.assignments[0]?.userId).toBe(dev.id)
    expect(createdTicket.incidence?.pages).toHaveLength(0)

    const assignment = createdTicket.incidence?.assignments[0]
    const tasks = await db.task.findMany({ where: { assignmentId: assignment?.id } })
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.title).toBe('Corrección')
    expect(tasks[0]?.description).toBe('Detalle')
  })

  it('creates an incidence automatically when assigning an existing NEW ticket', async () => {
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const { module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)

    const ticket = await db.ticketQA.create({
      data: {
        tracklistId: tracklist.id,
        ticketNumber: 1,
        type: TicketType.CAMBIO,
        moduleId: moduleRecord.id,
        description: 'Cambio pendiente',
        priority: Priority.MEDIUM,
        externalWorkItemId: workItem.id,
        reportedById: qa.id,
        status: TicketQAStatus.NEW,
      },
    })

    actAs(qa)
    const result = await updateTicket(ticket.id, tracklist.id, {
      type: TicketType.CAMBIO,
      moduleId: moduleRecord.id,
      description: 'Cambio pendiente',
      priority: Priority.MEDIUM,
      externalWorkItemId: workItem.id,
      assignedToId: dev.id,
      observations: 'Asignado',
    })

    expect(result.success).toBe(true)

    const updatedTicket = await db.ticketQA.findUniqueOrThrow({
      where: { id: ticket.id },
      include: {
        incidence: {
          include: {
            assignments: true,
          },
        },
      },
    })

    expect(updatedTicket.status).toBe(TicketQAStatus.ASSIGNED)
    expect(updatedTicket.incidenceId).not.toBeNull()
    expect(updatedTicket.assignedToId).toBe(dev.id)
    expect(updatedTicket.incidence?.status).toBe(TaskStatus.BACKLOG)
    expect(updatedTicket.incidence?.assignments[0]?.userId).toBe(dev.id)
  })

  it('rolls back ticket creation when automatic assignment cannot create the incidence', async () => {
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const { module: moduleRecord } = await createTechnologyModule()
    const tracklist = await createTracklist(qa.id)

    actAs(qa)
    const result = await createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: moduleRecord.id,
      description: 'Ticket sin tramite',
      priority: Priority.HIGH,
      assignedToId: dev.id,
    })

    expect(result.success).toBe(false)

    const tickets = await db.ticketQA.findMany({ where: { tracklistId: tracklist.id } })
    expect(tickets).toHaveLength(0)
  })

  it('rolls back ticket update when automatic assignment cannot create the incidence', async () => {
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const { module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)

    const ticket = await db.ticketQA.create({
      data: {
        tracklistId: tracklist.id,
        ticketNumber: 1,
        type: TicketType.CAMBIO,
        moduleId: moduleRecord.id,
        description: 'Cambio pendiente',
        priority: Priority.MEDIUM,
        externalWorkItemId: workItem.id,
        reportedById: qa.id,
        status: TicketQAStatus.NEW,
      },
    })

    actAs(qa)
    const result = await updateTicket(ticket.id, tracklist.id, {
      type: TicketType.CAMBIO,
      moduleId: moduleRecord.id,
      description: 'Cambio sin tramite al asignar',
      priority: Priority.MEDIUM,
      assignedToId: dev.id,
    })

    expect(result.success).toBe(false)

    const storedTicket = await db.ticketQA.findUniqueOrThrow({ where: { id: ticket.id } })
    expect(storedTicket.externalWorkItemId).toBe(workItem.id)
    expect(storedTicket.assignedToId).toBeNull()
    expect(storedTicket.incidenceId).toBeNull()
  })
})
