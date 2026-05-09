import { describe, expect, it } from 'vitest'
import { EnvironmentLogEntryType, TaskStatus, TicketQAStatus } from '@prisma/client'

import { createTicket, getTicketById, getTicketsByTracklist, updateTicket } from '@/app/actions/tracklists'
import { db } from '@/lib/db'
import { Priority, TicketType } from '@/types/enums'
import {
  actAs,
  createExternalWorkItem,
  createIncidenceFixture,
  createTechnologyModule,
  createTicketFixture,
  createTracklist,
  createUser,
} from '@/tests/integration/helpers'

describe('ticket environment reference integration', () => {
  it('persists the reference environment when creating and editing an unassigned NEW ticket', async () => {
    const qa = await createUser('QA')
    const { module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const firstEnvironment = await db.environment.create({ data: { name: 'QA' } })
    const secondEnvironment = await db.environment.create({ data: { name: 'STG' } })

    actAs(qa)
    const created = await createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: moduleRecord.id,
      description: 'Error con ambiente',
      priority: Priority.MEDIUM,
      externalWorkItemId: workItem.id,
      environmentId: firstEnvironment.id,
    })

    expect(created.success).toBe(true)

    const stored = await db.ticketQA.findFirstOrThrow({ where: { tracklistId: tracklist.id } })
    expect(stored.environmentId).toBe(firstEnvironment.id)

    const updated = await updateTicket(stored.id, tracklist.id, {
      type: TicketType.CAMBIO,
      moduleId: moduleRecord.id,
      description: 'Cambio de ambiente',
      priority: Priority.HIGH,
      externalWorkItemId: workItem.id,
      environmentId: secondEnvironment.id,
    })

    expect(updated.success).toBe(true)
    await expect(db.ticketQA.findUniqueOrThrow({ where: { id: stored.id } })).resolves.toMatchObject({
      environmentId: secondEnvironment.id,
    })

    const fetched = await getTicketById(stored.id)
    expect(fetched.success).toBe(true)
    expect(fetched.data?.referenceEnvironment).toEqual({ id: secondEnvironment.id, name: 'STG' })
  }, 10_000)

  it('rejects inactive or missing reference environments', async () => {
    const qa = await createUser('QA')
    const { module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const inactiveEnvironment = await db.environment.create({ data: { name: 'OLD', isEnabled: false } })

    actAs(qa)
    await expect(createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: moduleRecord.id,
      description: 'Ambiente inactivo',
      priority: Priority.MEDIUM,
      externalWorkItemId: workItem.id,
      environmentId: inactiveEnvironment.id,
    })).resolves.toEqual({
      success: false,
      error: 'El ambiente seleccionado no es válido',
    })

    await expect(createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: moduleRecord.id,
      description: 'Ambiente inexistente',
      priority: Priority.MEDIUM,
      externalWorkItemId: workItem.id,
      environmentId: 999_999,
    })).resolves.toEqual({
      success: false,
      error: 'El ambiente seleccionado no es válido',
    })
  })

  it('keeps the reference environment separate from the list deployment summary', async () => {
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const referenceEnvironment = await db.environment.create({ data: { name: 'QA' } })
    const deployedEnvironment = await db.environment.create({ data: { name: 'PROD' } })
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.REVIEW,
      assignees: [{ userId: dev.id }],
    })
    await db.incidence.update({
      where: { id: incidence.id },
      data: { readyForDeployAt: new Date('2026-05-09T09:00:00Z') },
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      externalWorkItemId: workItem.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      status: TicketQAStatus.TEST,
      environmentId: referenceEnvironment.id,
    })

    await db.environmentLogEntry.create({
      data: {
        type: EnvironmentLogEntryType.DEPLOY,
        environmentId: deployedEnvironment.id,
        ticketId: ticket.id,
        incidenceId: incidence.id,
        createdById: qa.id,
        occurredAt: new Date(),
      },
    })

    actAs(qa)
    const tickets = await getTicketsByTracklist(tracklist.id)
    const listedTicket = tickets.data?.find((item) => item.id === ticket.id)

    expect(tickets.success).toBe(true)
    expect(listedTicket?.referenceEnvironment).toEqual({ id: referenceEnvironment.id, name: 'QA' })
    expect(listedTicket?.deploymentSummary.isCurrentlyDeployed).toBe(true)
    expect(listedTicket?.deploymentSummary.deployedEnvironmentCount).toBe(1)
  })

  it('summarizes current deployment only when the latest deploy is newer than readyForDeployAt', async () => {
    const qa = await createUser('QA')
    const dev = await createUser('DEV')
    const { technology, module: moduleRecord } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklist(qa.id)
    const environment = await db.environment.create({ data: { name: 'QA' } })
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.REVIEW,
      assignees: [{ userId: dev.id }],
    })
    await db.incidence.update({
      where: { id: incidence.id },
      data: { readyForDeployAt: new Date('2026-05-09T09:00:00Z') },
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: moduleRecord.id,
      reportedById: qa.id,
      externalWorkItemId: workItem.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      status: TicketQAStatus.TEST,
    })

    await db.environmentLogEntry.create({
      data: {
        type: EnvironmentLogEntryType.DEPLOY,
        environmentId: environment.id,
        ticketId: ticket.id,
        incidenceId: incidence.id,
        createdById: qa.id,
        occurredAt: new Date('2026-05-09T10:00:00Z'),
      },
    })

    actAs(qa)
    const deployed = await getTicketsByTracklist(tracklist.id)
    expect(deployed.success).toBe(true)
    expect(deployed.data?.[0]?.deploymentSummary.isCurrentlyDeployed).toBe(true)

    await db.incidence.update({
      where: { id: incidence.id },
      data: { readyForDeployAt: new Date('2026-05-10T11:00:00Z') },
    })

    const pending = await getTicketsByTracklist(tracklist.id)
    expect(pending.success).toBe(true)
    expect(pending.data?.[0]?.deploymentSummary.isCurrentlyDeployed).toBe(false)
  })
})
