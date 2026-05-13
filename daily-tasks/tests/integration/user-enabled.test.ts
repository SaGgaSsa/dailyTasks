import { describe, expect, it } from 'vitest'
import bcrypt from 'bcryptjs'
import { TaskStatus, TicketQAStatus, UserRole } from '@prisma/client'

import { saveIncidenceTaskChanges } from '@/app/actions/incidence-actions'
import { createTicket } from '@/app/actions/tracklists'
import { getCachedAssignableUsers, getUsers, setUserEnabled } from '@/app/actions/user-actions'
import { authConfig } from '@/auth.config'
import { db } from '@/lib/db'
import { Priority, TicketType } from '@/types/enums'
import {
  actAs,
  createExternalWorkItem,
  createIncidenceFixture,
  createTechnologyModule,
  createTicketFixture,
  createTracklist as createTracklistFixture,
  createUser,
} from '@/tests/integration/helpers'

describe('user enabled state integration', () => {
  it('rejects credential login for inactive users', async () => {
    const dev = await createUser(UserRole.DEV, { email: 'inactive@example.com' })
    const password = 'valid-password'
    await db.user.update({
      where: { id: dev.id },
      data: {
        isEnabled: false,
        password: await bcrypt.hash(password, 10),
      },
    })

    const credentialsProvider = authConfig.providers[0] as unknown as {
      options: {
        authorize: (credentials: Partial<Record<'email' | 'password', unknown>>, request: Request) => Promise<unknown>
      }
    }

    await expect(
      credentialsProvider.options.authorize(
        { email: dev.email, password },
        new Request('http://localhost/api/auth/callback/credentials')
      )
    ).rejects.toThrow('Usuario inactivo')
  })

  it('lets admins disable and reactivate users without pending work', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)

    actAs(admin)
    const disableResult = await setUserEnabled(dev.id, false)
    expect(disableResult.success).toBe(true)

    await expect(db.user.findUniqueOrThrow({ where: { id: dev.id } })).resolves.toMatchObject({
      isEnabled: false,
    })

    const usersResult = await getUsers()
    expect(usersResult.success).toBe(true)
    expect(usersResult.data?.find((user) => user.id === dev.id)?.isEnabled).toBe(false)

    const reactivateResult = await setUserEnabled(dev.id, true)
    expect(reactivateResult.success).toBe(true)

    await expect(db.user.findUniqueOrThrow({ where: { id: dev.id } })).resolves.toMatchObject({
      isEnabled: true,
    })
  })

  it('blocks disabling users with pending or deferred tickets incidences and tasks', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const ticketDev = await createUser(UserRole.DEV)
    const incidenceDev = await createUser(UserRole.DEV)
    const taskDev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const { technology, module } = await createTechnologyModule()
    const tracklist = await createTracklistFixture(qa.id)

    await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: qa.id,
      assignedToId: ticketDev.id,
      status: TicketQAStatus.DEFERRED,
    })

    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: (await createExternalWorkItem()).id,
      status: TaskStatus.DEFERRED,
      assignees: [{ userId: incidenceDev.id }],
    })

    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: (await createExternalWorkItem()).id,
      status: TaskStatus.DONE,
      assignees: [{ userId: taskDev.id }],
      tasks: [{ userId: taskDev.id, title: 'Pendiente en incidencia cerrada', isCompleted: false }],
    })

    actAs(admin)

    await expect(setUserEnabled(ticketDev.id, false)).resolves.toMatchObject({ success: false })
    await expect(setUserEnabled(incidenceDev.id, false)).resolves.toMatchObject({ success: false })
    await expect(setUserEnabled(taskDev.id, false)).resolves.toMatchObject({ success: false })
  })

  it('allows disabling users whose work is completed or dismissed', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const { technology, module } = await createTechnologyModule()
    const tracklist = await createTracklistFixture(qa.id)

    await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      status: TicketQAStatus.COMPLETED,
    })
    await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      status: TicketQAStatus.DISMISSED,
    })
    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: (await createExternalWorkItem()).id,
      status: TaskStatus.DONE,
      assignees: [{ userId: dev.id }],
      tasks: [{ userId: dev.id, title: 'Lista', isCompleted: true }],
    })
    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: (await createExternalWorkItem()).id,
      status: TaskStatus.DISMISSED,
      assignees: [{ userId: dev.id }],
    })

    actAs(admin)
    const result = await setUserEnabled(dev.id, false)

    expect(result.success).toBe(true)
  })

  it('does not allow disabling yourself or the last active admin', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const secondAdmin = await createUser(UserRole.ADMIN)

    actAs(admin)
    await expect(setUserEnabled(admin.id, false)).resolves.toMatchObject({
      success: false,
    })

    const disableSecondAdmin = await setUserEnabled(secondAdmin.id, false)
    expect(disableSecondAdmin.success).toBe(true)

    await expect(setUserEnabled(admin.id, false)).resolves.toMatchObject({
      success: false,
    })
  })

  it('blocks inactive users from authenticated server actions immediately', async () => {
    const admin = await createUser(UserRole.ADMIN)

    await db.user.update({ where: { id: admin.id }, data: { isEnabled: false } })
    actAs(admin)

    const result = await getUsers()

    expect(result.success).toBe(false)
    expect(result.error).toBe('No autorizado')
  })

  it('excludes inactive users from new assignments but keeps historical assignments visible', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const activeDev = await createUser(UserRole.DEV)
    const inactiveDev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const { technology, module } = await createTechnologyModule()
    const tracklist = await createTracklistFixture(qa.id)
    const workItem = await createExternalWorkItem()

    await db.user.update({ where: { id: inactiveDev.id }, data: { isEnabled: false } })
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      status: TaskStatus.DONE,
      assignees: [{ userId: inactiveDev.id }],
      tasks: [{ userId: inactiveDev.id, title: 'Histórica', isCompleted: true }],
    })

    actAs(admin)
    const assignableUsers = await getCachedAssignableUsers()
    expect(assignableUsers.map((user) => user.id)).toContain(activeDev.id)
    expect(assignableUsers.map((user) => user.id)).not.toContain(inactiveDev.id)

    const incidenceResult = await saveIncidenceTaskChanges({
      incidenceId: incidence.id,
      assignees: [{ userId: inactiveDev.id, assignedHours: 2 }],
    })
    expect(incidenceResult.success).toBe(false)

    const ticketResult = await createTicket(tracklist.id, {
      type: TicketType.BUG,
      moduleId: module.id,
      description: 'Ticket asignado a inactivo',
      priority: Priority.MEDIUM,
      externalWorkItemId: (await createExternalWorkItem()).id,
      assignedToId: inactiveDev.id,
    })
    expect(ticketResult.success).toBe(false)

    const storedIncidence = await db.incidence.findUniqueOrThrow({
      where: { id: incidence.id },
      include: { assignments: { include: { user: true } } },
    })
    expect(storedIncidence.assignments[0]?.user.id).toBe(inactiveDev.id)
  })
})
