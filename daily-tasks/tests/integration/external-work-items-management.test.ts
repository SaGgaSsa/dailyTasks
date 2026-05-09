import { describe, expect, it } from 'vitest'
import { ExternalWorkItemStatus, UserRole } from '@prisma/client'

import {
  createExternalWorkItem as createExternalWorkItemAction,
  createWorkItemType,
  deleteExternalWorkItem,
  deleteWorkItemType,
  getExternalWorkItemsManagementData,
  updateWorkItemTypeColor,
  updateExternalWorkItemStatus,
} from '@/app/actions/external-work-items'
import { db } from '@/lib/db'
import { actAs, createTechnologyModule, createUser } from '@/tests/integration/helpers'
import { clearMockSession, revalidatePathMock, revalidateTagMock } from '@/tests/integration/setup'

async function createType(name: string) {
  return db.workItemType.create({
    data: { name },
  })
}

async function createWorkItem(input: {
  typeId: number
  externalId: number
  title: string
  status?: ExternalWorkItemStatus
}) {
  return db.externalWorkItem.create({
    data: {
      workItemTypeId: input.typeId,
      externalId: input.externalId,
      title: input.title,
      status: input.status ?? ExternalWorkItemStatus.ACTIVE,
    },
  })
}

describe('external work item management', () => {
  it('allows ADMIN and QA to create and update external work items and rejects DEV and anonymous users', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const qa = await createUser(UserRole.QA)
    const dev = await createUser(UserRole.DEV)
    const type = await createType('I_MODAPL')

    actAs(dev)
    await expect(
      createExternalWorkItemAction({ workItemTypeId: type.id, externalId: 100, title: 'Bloqueado' })
    ).resolves.toEqual({
      success: false,
      error: 'Solo administradores y QA pueden modificar trámites',
    })

    clearMockSession()
    await expect(
      updateExternalWorkItemStatus({ id: 1, status: ExternalWorkItemStatus.INACTIVE })
    ).resolves.toEqual({
      success: false,
      error: 'No autorizado',
    })

    actAs(admin)
    const adminCreated = await createExternalWorkItemAction({
      workItemTypeId: type.id,
      externalId: 101,
      title: 'Alta admin',
    })
    expect(adminCreated.success).toBe(true)
    expect(adminCreated.data).toMatchObject({
      externalId: 101,
      title: 'Alta admin',
      status: ExternalWorkItemStatus.ACTIVE,
    })

    actAs(qa)
    const qaCreated = await createExternalWorkItemAction({
      workItemTypeId: type.id,
      externalId: 102,
      title: 'Alta QA',
    })
    expect(qaCreated.success).toBe(true)
    const qaItem = qaCreated.data
    if (!qaItem || 'duplicateInactive' in qaItem) {
      throw new Error('Expected created external work item')
    }

    const disabled = await updateExternalWorkItemStatus({
      id: qaItem.id,
      status: ExternalWorkItemStatus.INACTIVE,
    })
    expect(disabled.success).toBe(true)
    expect(disabled.data?.status).toBe(ExternalWorkItemStatus.INACTIVE)
    expect(revalidateTagMock).toHaveBeenCalledWith('external-work-items', 'default')
    expect(revalidatePathMock).toHaveBeenCalledWith('/tramites')
  })

  it('allows ADMIN and QA to delete external work items without relations', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const qa = await createUser(UserRole.QA)
    const type = await createType('I_MODAPL')
    const adminItem = await createWorkItem({ typeId: type.id, externalId: 100, title: 'Borrar admin' })
    const qaItem = await createWorkItem({ typeId: type.id, externalId: 101, title: 'Borrar QA' })

    actAs(admin)
    await expect(deleteExternalWorkItem(adminItem.id)).resolves.toEqual({ success: true })

    actAs(qa)
    await expect(deleteExternalWorkItem(qaItem.id)).resolves.toEqual({ success: true })

    await expect(db.externalWorkItem.findMany({ orderBy: { externalId: 'asc' } })).resolves.toEqual([])
    expect(revalidateTagMock).toHaveBeenCalledWith('external-work-items', 'default')
    expect(revalidatePathMock).toHaveBeenCalledWith('/tramites')
  })

  it('rejects DEV users when deleting external work items', async () => {
    const dev = await createUser(UserRole.DEV)
    const type = await createType('I_MODAPL')
    const item = await createWorkItem({ typeId: type.id, externalId: 100, title: 'No borrar' })

    actAs(dev)
    await expect(deleteExternalWorkItem(item.id)).resolves.toEqual({
      success: false,
      error: 'Solo administradores y QA pueden modificar trámites',
    })

    await expect(db.externalWorkItem.findUnique({ where: { id: item.id } })).resolves.toMatchObject({
      id: item.id,
    })
  })

  it('returns a controlled error when deleting an external work item used by an incidence', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const type = await createType('I_MODAPL')
    const item = await createWorkItem({ typeId: type.id, externalId: 100, title: 'Relacionado' })
    const { technology } = await createTechnologyModule()
    await db.incidence.create({
      data: {
        externalWorkItemId: item.id,
        description: 'Incidencia relacionada',
        technologyId: technology.id,
        priority: 'MEDIUM',
        status: 'BACKLOG',
      },
    })

    actAs(admin)
    await expect(deleteExternalWorkItem(item.id)).resolves.toEqual({
      success: false,
      error: 'No se puede eliminar: el trámite tiene incidencias relacionadas',
    })

    await expect(db.externalWorkItem.findUnique({ where: { id: item.id } })).resolves.toMatchObject({
      id: item.id,
    })
  })

  it('keeps activation separate from deletion when toggling external work item status', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const type = await createType('I_MODAPL')
    const item = await createWorkItem({ typeId: type.id, externalId: 100, title: 'Persistente' })

    actAs(admin)
    const disabled = await updateExternalWorkItemStatus({
      id: item.id,
      status: ExternalWorkItemStatus.INACTIVE,
    })
    expect(disabled.success).toBe(true)
    expect(disabled.data?.status).toBe(ExternalWorkItemStatus.INACTIVE)

    const storedInactive = await db.externalWorkItem.findUniqueOrThrow({ where: { id: item.id } })
    expect(storedInactive).toMatchObject({
      title: 'Persistente',
      status: ExternalWorkItemStatus.INACTIVE,
    })

    const enabled = await updateExternalWorkItemStatus({
      id: item.id,
      status: ExternalWorkItemStatus.ACTIVE,
    })
    expect(enabled.success).toBe(true)
    expect(enabled.data?.status).toBe(ExternalWorkItemStatus.ACTIVE)

    await expect(db.externalWorkItem.findUnique({ where: { id: item.id } })).resolves.toMatchObject({
      id: item.id,
      status: ExternalWorkItemStatus.ACTIVE,
    })
  })

  it('protects work item type mutations with the same ADMIN and QA permission', async () => {
    const qa = await createUser(UserRole.QA)
    const dev = await createUser(UserRole.DEV)

    actAs(qa)
    const createdType = await createWorkItemType({ name: 'I_CASO' })
    expect(createdType.success).toBe(true)

    actAs(dev)
    await expect(createWorkItemType({ name: 'I_CONS' })).resolves.toEqual({
      success: false,
      error: 'Solo administradores y QA pueden modificar trámites',
    })
    await expect(deleteWorkItemType(createdType.data!.id)).resolves.toEqual({
      success: false,
      error: 'Solo administradores y QA pueden modificar trámites',
    })
  })

  it('updates work item type colors with free colors, null, and the current color only', async () => {
    const qa = await createUser(UserRole.QA)
    const first = await db.workItemType.create({ data: { name: 'I_MODAPL', color: 'blue' } })
    const second = await db.workItemType.create({ data: { name: 'I_CONS', color: 'purple' } })

    actAs(qa)

    const freeColor = await updateWorkItemTypeColor(first.id, 'green')
    expect(freeColor.success).toBe(true)
    expect(freeColor.data).toMatchObject({ id: first.id, color: 'green' })

    const sameColor = await updateWorkItemTypeColor(first.id, 'green')
    expect(sameColor.success).toBe(true)
    expect(sameColor.data).toMatchObject({ id: first.id, color: 'green' })

    await expect(updateWorkItemTypeColor(first.id, 'purple')).resolves.toEqual({
      success: false,
      error: 'El color seleccionado ya está en uso',
    })

    await expect(updateWorkItemTypeColor(first.id, 'invalid')).resolves.toEqual({
      success: false,
      error: 'El color seleccionado no es válido',
    })

    const noColor = await updateWorkItemTypeColor(first.id, null)
    expect(noColor.success).toBe(true)
    expect(noColor.data).toMatchObject({ id: first.id, color: null })

    await expect(db.workItemType.findUniqueOrThrow({ where: { id: second.id } })).resolves.toMatchObject({
      color: 'purple',
    })
  })

  it('lists active work items by default and includes inactive ones only when requested', async () => {
    const type = await createType('I_MODAPL')
    await createWorkItem({ typeId: type.id, externalId: 100, title: 'Activo' })
    await createWorkItem({
      typeId: type.id,
      externalId: 101,
      title: 'Inactivo',
      status: ExternalWorkItemStatus.INACTIVE,
    })

    const defaultResult = await getExternalWorkItemsManagementData({})
    expect(defaultResult.success).toBe(true)
    expect(defaultResult.data?.items.map((item) => item.externalId)).toEqual([100])

    const withInactive = await getExternalWorkItemsManagementData({ includeInactive: true })
    expect(withInactive.success).toBe(true)
    expect(withInactive.data?.items.map((item) => item.externalId)).toEqual([100, 101])
  })

  it('filters management results by one type and searches by external number or title', async () => {
    const modapl = await createType('I_MODAPL')
    const cons = await createType('I_CONS')
    await createWorkItem({ typeId: modapl.id, externalId: 100, title: 'Portal clientes' })
    await createWorkItem({ typeId: modapl.id, externalId: 200, title: 'Alta proveedores' })
    await createWorkItem({ typeId: cons.id, externalId: 300, title: 'Consulta portal' })

    const byType = await getExternalWorkItemsManagementData({ workItemTypeId: modapl.id })
    expect(byType.success).toBe(true)
    expect(byType.data?.items.map((item) => item.externalId)).toEqual([100, 200])

    const byTitle = await getExternalWorkItemsManagementData({ query: 'portal' })
    expect(byTitle.success).toBe(true)
    expect(byTitle.data?.items.map((item) => item.externalId)).toEqual([100, 300])

    const byNumber = await getExternalWorkItemsManagementData({ query: '200' })
    expect(byNumber.success).toBe(true)
    expect(byNumber.data?.items.map((item) => item.externalId)).toEqual([200])
  })

  it('paginates management results with 20 items per page', async () => {
    const type = await createType('I_MODAPL')
    await Promise.all(
      Array.from({ length: 25 }, (_, index) =>
        createWorkItem({
          typeId: type.id,
          externalId: index + 1,
          title: `Tramite ${index + 1}`,
        })
      )
    )

    const firstPage = await getExternalWorkItemsManagementData({ page: 1 })
    expect(firstPage.success).toBe(true)
    expect(firstPage.data?.items).toHaveLength(20)
    expect(firstPage.data?.total).toBe(25)
    expect(firstPage.data?.totalPages).toBe(2)
    expect(firstPage.data?.items[0].externalId).toBe(1)
    expect(firstPage.data?.items[19].externalId).toBe(20)

    const secondPage = await getExternalWorkItemsManagementData({ page: 2 })
    expect(secondPage.success).toBe(true)
    expect(secondPage.data?.items.map((item) => item.externalId)).toEqual([21, 22, 23, 24, 25])
  })

  it('reactivates an inactive duplicate when accepting the add modal data', async () => {
    const qa = await createUser(UserRole.QA)
    const type = await createType('I_MODAPL')
    const existing = await createWorkItem({
      typeId: type.id,
      externalId: 100,
      title: 'Titulo anterior',
      status: ExternalWorkItemStatus.INACTIVE,
    })

    actAs(qa)
    const result = await createExternalWorkItemAction({
      workItemTypeId: type.id,
      externalId: 100,
      title: 'Titulo nuevo',
    })

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({
      id: existing.id,
      externalId: 100,
      title: 'Titulo nuevo',
      status: ExternalWorkItemStatus.ACTIVE,
    })

    await expect(
      db.externalWorkItem.findUniqueOrThrow({ where: { id: existing.id } })
    ).resolves.toMatchObject({
      title: 'Titulo nuevo',
      status: ExternalWorkItemStatus.ACTIVE,
    })
  })

  it('rejects an active duplicate with the same type and external number', async () => {
    const admin = await createUser(UserRole.ADMIN)
    const type = await createType('I_MODAPL')
    await createWorkItem({ typeId: type.id, externalId: 100, title: 'Existente' })

    actAs(admin)
    await expect(
      createExternalWorkItemAction({ workItemTypeId: type.id, externalId: 100, title: 'Duplicado' })
    ).resolves.toEqual({
      success: false,
      error: 'El trámite ya existe',
    })
  })
})
