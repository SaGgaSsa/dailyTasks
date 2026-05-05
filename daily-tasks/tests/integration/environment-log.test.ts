import { TaskStatus, TicketQAStatus, UserRole } from '@prisma/client'
import { describe, expect, it } from 'vitest'

import {
  getEnvironmentAvailability,
  getEnvironmentLogEntries,
  getPendingEnvironmentDeployItems,
  getSidebarFavoriteEnvironments,
  registerEnvironmentDeploys,
  toggleEnvironmentFavorite,
} from '@/app/actions/environment-log'
import { updateIncidenceStatus } from '@/app/actions/incidence-actions'
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

async function createEnabledEnvironment(name = 'TEST') {
  return db.environment.create({
    data: { name, isEnabled: true },
  })
}

async function createReviewIncidenceWithUser(devId: number) {
  const { technology, module } = await createTechnologyModule()
  const workItem = await createExternalWorkItem()
  const fixture = await createIncidenceFixture({
    externalWorkItemId: workItem.id,
    technologyId: technology.id,
    status: TaskStatus.REVIEW,
    estimatedTime: 8,
    assignees: [{ userId: devId, assignedHours: 8 }],
    tasks: [{ userId: devId, title: 'Lista', isCompleted: true }],
  })

  return { ...fixture, technology, module, workItem }
}

describe('environment log', () => {
  it.each([UserRole.ADMIN, UserRole.DEV])('%s can register pending deploys', async (role) => {
    const user = await createUser(role)
    actAs(user)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(user.id)

    const result = await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    expect(result.success).toBe(true)
    expect(await db.environmentLogEntry.count()).toBe(1)
  })

  it.each([UserRole.QA, null])('%s cannot register deploys', async (role) => {
    const dev = await createUser(UserRole.DEV)
    if (role) {
      const user = await createUser(role)
      actAs(user)
    }
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    const result = await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    expect(result.success).toBe(false)
    expect(await db.environmentLogEntry.count()).toBe(0)
  })

  it('creates one deploy entry per pending item and supports partial selection', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const first = await createReviewIncidenceWithUser(dev.id)
    const second = await createReviewIncidenceWithUser(dev.id)

    const pending = await getPendingEnvironmentDeployItems(environment.id)
    expect(pending.success).toBe(true)
    expect(pending.data?.map((item) => item.incidenceId).sort()).toEqual([first.incidence.id, second.incidence.id].sort())

    const partialResult = await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: first.incidence.id }],
    })

    expect(partialResult.success).toBe(true)
    expect(await db.environmentLogEntry.count()).toBe(1)
    const remaining = await getPendingEnvironmentDeployItems(environment.id)
    expect(remaining.data?.map((item) => item.incidenceId)).toEqual([second.incidence.id])
  })

  it('does not mix environment histories', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const firstEnvironment = await createEnabledEnvironment('DEV')
    const secondEnvironment = await createEnabledEnvironment('QA')
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    await registerEnvironmentDeploys({
      environmentId: firstEnvironment.id,
      items: [{ incidenceId: incidence.id }],
    })

    const firstHistory = await getEnvironmentLogEntries(firstEnvironment.id)
    const secondHistory = await getEnvironmentLogEntries(secondEnvironment.id)

    expect(firstHistory.data).toHaveLength(1)
    expect(secondHistory.data).toHaveLength(0)
  })

  it('uses the linked ticket as the deploy subject for incidence availability', async () => {
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence, module, workItem } = await createReviewIncidenceWithUser(dev.id)
    const tracklist = await createTracklist(qa.id)
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      externalWorkItemId: workItem.id,
      status: TicketQAStatus.TEST,
    })

    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    const entries = await db.environmentLogEntry.findMany()
    expect(entries[0]).toMatchObject({ ticketId: ticket.id, incidenceId: incidence.id })

    const availability = await getEnvironmentAvailability({ incidenceId: incidence.id })
    expect(availability.data?.[0]).toMatchObject({ environmentId: environment.id, isAvailable: true })
  })

  it('uses incidence deploys directly when there is no ticket', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    const availability = await getEnvironmentAvailability({ incidenceId: incidence.id })
    expect(availability.data?.[0]).toMatchObject({ environmentId: environment.id, isAvailable: true })
  })

  it('marks a deployed incidence pending again after it re-enters review', async () => {
    const dev = await createUser(UserRole.DEV)
    actAs(dev)
    const environment = await createEnabledEnvironment()
    const { incidence } = await createReviewIncidenceWithUser(dev.id)

    await registerEnvironmentDeploys({
      environmentId: environment.id,
      items: [{ incidenceId: incidence.id }],
    })

    await updateIncidenceStatus(incidence.id, TaskStatus.IN_PROGRESS, 1)
    await updateIncidenceStatus(incidence.id, TaskStatus.REVIEW, 1)

    const pending = await getPendingEnvironmentDeployItems(environment.id)
    expect(pending.data?.map((item) => item.incidenceId)).toEqual([incidence.id])
  })

  it('stores favorite environments per user', async () => {
    const firstUser = await createUser(UserRole.DEV)
    const secondUser = await createUser(UserRole.DEV)
    const environment = await createEnabledEnvironment()

    actAs(firstUser)
    await toggleEnvironmentFavorite(environment.id)
    expect((await getSidebarFavoriteEnvironments()).data).toEqual([
      { id: environment.id, name: environment.name },
    ])

    actAs(secondUser)
    expect((await getSidebarFavoriteEnvironments()).data).toEqual([])
  })
})
