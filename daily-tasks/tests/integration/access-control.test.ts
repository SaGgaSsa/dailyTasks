import { describe, expect, it } from 'vitest'
import { Prisma, UserRole } from '@prisma/client'

import { addLinkAttachment, deleteAttachment, updateAttachment, uploadAttachment } from '@/app/actions/attachment-actions'
import { syncNonWorkingDays } from '@/app/actions/non-working-days'
import { createPage, updatePageContent } from '@/app/actions/pages'
import { createScript, updateScript } from '@/app/actions/script-actions'
import { archiveTracklist, clearTicketUnreadUpdates, completeTracklist, createTracklist } from '@/app/actions/tracklists'
import { deleteUser, getUserDetails, getUsers, upsertUser } from '@/app/actions/user-actions'
import { deleteIncidence } from '@/app/actions/incidence-actions'
import { db } from '@/lib/db'
import { actAs, createExternalWorkItem, createIncidenceFixture, createTechnologyModule, createTicketFixture, createTracklist as createTracklistFixture, createUser } from '@/tests/integration/helpers'

describe('access control integration', () => {
  it('restricts page creation and editing by role, assignment, and authorship', async () => {
    const assignedDev = await createUser(UserRole.DEV)
    const otherDev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: assignedDev.id, assignedHours: 4 }],
    })

    actAs(qa)
    const qaCreateResult = await createPage(incidence.id, 'QA page')
    expect(qaCreateResult.success).toBe(false)

    actAs(otherDev)
    const unassignedCreateResult = await createPage(incidence.id, 'Other page')
    expect(unassignedCreateResult.success).toBe(false)

    actAs(assignedDev)
    const createResult = await createPage(incidence.id, 'DEV page')
    expect(createResult.success).toBe(true)
    if (!createResult.success || !('data' in createResult) || !createResult.data) {
      throw new Error('Expected page creation to succeed')
    }
    expect(createResult.data.authorId).toBe(assignedDev.id)

    actAs(otherDev)
    const updateResult = await updatePageContent(
      createResult.data.id,
      [] as Prisma.InputJsonValue,
      'Intento ajeno'
    )
    expect(updateResult.success).toBe(false)
  })

  it('restricts scripts to assigned devs and admins while leaving QA in read-only mode', async () => {
    const assignedDev = await createUser(UserRole.DEV)
    const otherDev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: assignedDev.id, assignedHours: 4 }],
    })

    actAs(qa)
    const qaCreateResult = await createScript({
      incidenceId: incidence.id,
      content: 'select 1',
      type: 'SQL',
    })
    expect(qaCreateResult.success).toBe(false)

    actAs(assignedDev)
    const createResult = await createScript({
      incidenceId: incidence.id,
      content: 'select 1',
      type: 'SQL',
    })
    expect(createResult.success).toBe(true)
    if (!createResult.success || !('data' in createResult) || !createResult.data) {
      throw new Error('Expected script creation to succeed')
    }

    actAs(otherDev)
    const updateResult = await updateScript(createResult.data.id, {
      content: 'select 2',
      type: 'SQL',
    })
    expect(updateResult.success).toBe(false)
  })

  it('derives attachment ownership from the session and blocks QA and unassigned devs', async () => {
    const assignedDev = await createUser(UserRole.DEV)
    const otherDev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: assignedDev.id, assignedHours: 4 }],
    })

    actAs(assignedDev)
    const createResult = await addLinkAttachment({
      externalWorkItemId: workItem.id,
      name: 'Documento',
      url: 'https://example.com/doc',
      description: 'Adjunto de prueba',
    })
    expect(createResult.success).toBe(true)

    const attachment = await db.attachment.findFirstOrThrow({
      where: { externalWorkItemId: workItem.id, name: 'Documento' },
    })
    expect(attachment.uploadedById).toBe(assignedDev.id)

    actAs(qa)
    const qaCreateResult = await addLinkAttachment({
      externalWorkItemId: workItem.id,
      name: 'QA documento',
      url: 'https://example.com/qa',
    })
    expect(qaCreateResult.success).toBe(false)

    actAs(otherDev)
    const updateResult = await updateAttachment(attachment.id, {
      name: 'Documento ajeno',
      url: 'https://example.com/otro',
    })
    expect(updateResult.success).toBe(false)

    const deleteResult = await deleteAttachment(attachment.id)
    expect(deleteResult.success).toBe(false)
  })

  it('allows http attachment links and rejects svg uploads', async () => {
    const assignedDev = await createUser(UserRole.DEV)
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: assignedDev.id, assignedHours: 4 }],
    })

    actAs(assignedDev)
    const linkResult = await addLinkAttachment({
      externalWorkItemId: workItem.id,
      name: 'Link interno',
      url: 'http://intranet.local/doc',
    })
    expect(linkResult.success).toBe(true)

    const formData = new FormData()
    formData.set('externalWorkItemId', String(workItem.id))
    formData.set('name', 'SVG bloqueado')
    formData.set('file', new File(['<svg></svg>'], 'blocked.svg', { type: 'image/svg+xml' }))

    const uploadResult = await uploadAttachment(formData)
    expect(uploadResult.success).toBe(false)
    expect(uploadResult.error).toContain('Extensión no permitida')
  })

  it('rejects deleting file attachments when the stored url escapes the allowed uploads root', async () => {
    const assignedDev = await createUser(UserRole.DEV)
    const { technology } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: assignedDev.id, assignedHours: 4 }],
    })

    const attachment = await db.attachment.create({
      data: {
        type: 'FILE',
        name: 'malicioso',
        originalName: 'malicioso.txt',
        url: '/uploads/../../etc/passwd',
        externalWorkItemId: workItem.id,
        uploadedById: assignedDev.id,
        isOriginal: false,
      },
    })

    actAs(assignedDev)
    const result = await deleteAttachment(attachment.id)
    expect(result.success).toBe(false)
    expect(result.error).toBe('La ruta del archivo adjunto no es válida')
  })

  it('limits non-working-day sync and tracklist management to admin and QA', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)

    actAs(dev)
    const devSyncResult = await syncNonWorkingDays([new Date('2026-01-01T00:00:00.000Z')])
    expect(devSyncResult.success).toBe(false)

    actAs(qa)
    const qaSyncResult = await syncNonWorkingDays([new Date('2026-01-01T00:00:00.000Z')])
    expect(qaSyncResult.success).toBe(true)

    actAs(dev)
    const devCreateTracklist = await createTracklist({ title: 'Tracklist DEV' })
    expect(devCreateTracklist.success).toBe(false)

    actAs(qa)
    const qaCreateTracklist = await createTracklist({ title: 'Tracklist QA' })
    expect(qaCreateTracklist.success).toBe(true)

    actAs(dev)
    const devCompleteResult = await completeTracklist(qaCreateTracklist.data!.id)
    expect(devCompleteResult.success).toBe(false)

    actAs(admin)
    const adminArchiveResult = await archiveTracklist(qaCreateTracklist.data!.id)
    expect(adminArchiveResult.success).toBe(true)
  })

  it('limits clearing unread ticket updates to authorized users', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const qa = await createUser(UserRole.QA)
    const assignedDev = await createUser(UserRole.DEV)
    const otherDev = await createUser(UserRole.DEV)
    const { technology, module } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklistFixture(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: assignedDev.id, assignedHours: 2 }],
    })
    const ticket = await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: qa.id,
      assignedToId: assignedDev.id,
      incidenceId: incidence.id,
      status: 'ASSIGNED',
      description: 'ticket con novedades',
    })
    await db.ticketQA.update({ where: { id: ticket.id }, data: { hasUnreadUpdates: true } })

    actAs(otherDev)
    const unauthorizedResult = await clearTicketUnreadUpdates(ticket.id, tracklist.id)
    expect(unauthorizedResult.success).toBe(false)

    actAs(assignedDev)
    const assignedResult = await clearTicketUnreadUpdates(ticket.id, tracklist.id)
    expect(assignedResult.success).toBe(true)

    await db.ticketQA.update({ where: { id: ticket.id }, data: { hasUnreadUpdates: true } })

    actAs(admin)
    const adminResult = await clearTicketUnreadUpdates(ticket.id, tracklist.id)
    expect(adminResult.success).toBe(true)
  })

  it('blocks deleting incidences linked to QA tickets', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const qa = await createUser(UserRole.QA)
    const dev = await createUser(UserRole.DEV)
    const { technology, module } = await createTechnologyModule()
    const workItem = await createExternalWorkItem()
    const tracklist = await createTracklistFixture(qa.id)
    const { incidence } = await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: workItem.id,
      assignees: [{ userId: dev.id, assignedHours: 3 }],
    })

    await createTicketFixture({
      tracklistId: tracklist.id,
      moduleId: module.id,
      reportedById: qa.id,
      assignedToId: dev.id,
      incidenceId: incidence.id,
      status: 'ASSIGNED',
    })

    actAs(admin)
    const result = await deleteIncidence(incidence.id)
    expect(result.success).toBe(false)
    expect(result.error).toBe('No se pueden eliminar incidencias con tickets QA relacionados')
  })

  it('keeps user listing and mutations admin-only', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)

    actAs(dev)
    const unauthorizedUsers = await getUsers()
    expect(unauthorizedUsers.success).toBe(false)
    expect(unauthorizedUsers.error).toBe('No autorizado')
    expect(unauthorizedUsers.data).toBeUndefined()

    const unauthorizedDelete = await deleteUser(qa.id)
    expect(unauthorizedDelete.success).toBe(false)

    actAs(admin)
    const usersResult = await getUsers()
    expect(usersResult.success).toBe(true)
    expect(usersResult.error).toBeUndefined()
    const users = usersResult.data ?? []
    expect(users.length).toBe(3)
    expect('password' in users[0]!).toBe(false)

    const upsertResult = await upsertUser({
      id: qa.id,
      username: qa.username,
      name: 'QA actualizado',
      email: qa.email,
      password: '',
      role: UserRole.QA,
      technologies: [],
    })
    expect(upsertResult.success).toBe(true)

    const storedQa = await db.user.findUniqueOrThrow({ where: { id: qa.id } })
    expect(storedQa.name).toBe('QA actualizado')
  })

  it('keeps administrative user detail restricted to admins', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const qa = await createUser(UserRole.QA)

    actAs(qa)
    const unauthorizedDetails = await getUserDetails(admin.id)
    expect(unauthorizedDetails.success).toBe(false)
    expect(unauthorizedDetails.data).toBeUndefined()

    actAs(admin)
    const adminDetails = await getUserDetails(qa.id)
    expect(adminDetails.success).toBe(true)
    expect(adminDetails.data?.id).toBe(qa.id)
  })

  it('counts real tasks in user details using active assignments only', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    const { technology } = await createTechnologyModule()
    const firstWorkItem = await createExternalWorkItem()
    const secondWorkItem = await createExternalWorkItem()

    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: firstWorkItem.id,
      assignees: [{ userId: dev.id, assignedHours: 4, isAssigned: true }],
      tasks: [
        { userId: dev.id, title: 'Pendiente 1', isCompleted: false },
        { userId: dev.id, title: 'Hecha 1', isCompleted: true },
      ],
    })

    await createIncidenceFixture({
      technologyId: technology.id,
      externalWorkItemId: secondWorkItem.id,
      assignees: [{ userId: dev.id, assignedHours: 2, isAssigned: false }],
      tasks: [
        { userId: dev.id, title: 'Ignorada', isCompleted: false },
      ],
    })

    actAs(admin)
    const detailsResult = await getUserDetails(dev.id)
    expect(detailsResult.success).toBe(true)
    expect(detailsResult.data?.metrics).toEqual({
      totalTasks: 2,
      pendingTasks: 1,
      completedTasks: 1,
    })
  })
})
