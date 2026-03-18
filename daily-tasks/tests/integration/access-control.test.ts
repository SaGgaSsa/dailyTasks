import { describe, expect, it } from 'vitest'
import { Prisma, UserRole } from '@prisma/client'

import { addLinkAttachment, deleteAttachment, updateAttachment } from '@/app/actions/attachment-actions'
import { syncNonWorkingDays } from '@/app/actions/non-working-days'
import { createPage, updatePageContent } from '@/app/actions/pages'
import { createScript, updateScript } from '@/app/actions/script-actions'
import { archiveTracklist, completeTracklist, createTracklist } from '@/app/actions/tracklists'
import { deleteUser, getUsers, upsertUser } from '@/app/actions/user-actions'
import { db } from '@/lib/db'
import { actAs, createExternalWorkItem, createIncidenceFixture, createTechnologyModule, createUser } from '@/tests/integration/helpers'

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

  it('keeps user listing and mutations admin-only', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const dev = await createUser(UserRole.DEV)
    const qa = await createUser(UserRole.QA)

    actAs(dev)
    const unauthorizedUsers = await getUsers()
    expect(unauthorizedUsers.error).toBe('No autorizado')
    expect(unauthorizedUsers.data).toEqual([])

    const unauthorizedDelete = await deleteUser(qa.id)
    expect(unauthorizedDelete.success).toBe(false)

    actAs(admin)
    const usersResult = await getUsers()
    expect(usersResult.error).toBeUndefined()
    expect(usersResult.data.length).toBe(3)
    expect('password' in usersResult.data[0]!).toBe(false)

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
})
