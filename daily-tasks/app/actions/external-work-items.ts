'use server'

import { revalidatePath, unstable_cache, revalidateTag } from 'next/cache'
import { ExternalWorkItemStatus, Prisma } from '.prisma/client'
import { db } from '@/lib/db'
import { canManageExternalWorkItems, getAuthenticatedUser } from '@/lib/authorization'
import { WORK_ITEM_TYPE_COLOR_LIMIT, WORK_ITEM_TYPE_COLOR_OPTIONS, type WorkItemTypeColor } from '@/lib/work-item-color-options'
import { externalWorkItemBaseSelect, serializeExternalWorkItem, serializeWorkItemType } from '@/lib/work-item-types'
import { ExternalWorkItemSummary, WorkItemTypeOption } from '@/types'

const workItemTypeSelect = {
  id: true,
  name: true,
  color: true,
} as const

const allowedColors = new Set<string>(WORK_ITEM_TYPE_COLOR_OPTIONS.map((option) => option.value))
const activeWorkItemWhere = { status: ExternalWorkItemStatus.ACTIVE } as const
const EXTERNAL_WORK_ITEMS_PAGE_SIZE = 20

type ActionResult<T = undefined> =
  | (T extends undefined ? { success: true; data?: undefined } : { success: true; data: T })
  | { success: false; error: string; data?: undefined }

export interface ExternalWorkItemsManagementInput {
  page?: number
  workItemTypeId?: number | null
  query?: string
  includeInactive?: boolean
}

export interface ExternalWorkItemsManagementData {
  items: ExternalWorkItemSummary[]
  workItemTypes: WorkItemTypeOption[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

async function requireExternalWorkItemManager(): Promise<ActionResult> {
  const user = await getAuthenticatedUser()

  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  if (!canManageExternalWorkItems(user.role)) {
    return { success: false, error: 'Solo administradores y QA pueden modificar trámites' }
  }

  return { success: true }
}

function revalidateExternalWorkItems() {
  revalidateTag('external-work-items', 'default')
  revalidatePath('/tramites')
}

function isPositiveInteger(value: number | null | undefined) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

export const getCachedExternalWorkItems = unstable_cache(
  async (): Promise<ExternalWorkItemSummary[]> => {
    const items = await db.externalWorkItem.findMany({
      where: activeWorkItemWhere,
      select: externalWorkItemBaseSelect,
      orderBy: [{ workItemType: { name: 'asc' } }, { externalId: 'asc' }],
    })

    return items.map(serializeExternalWorkItem)
  },
  ['external-work-items-cache-key'],
  { tags: ['external-work-items'] }
)

export const getCachedWorkItemTypes = unstable_cache(
  async (): Promise<WorkItemTypeOption[]> => {
    const workItemTypes = await db.workItemType.findMany({
      select: workItemTypeSelect,
      orderBy: { name: 'asc' },
    })

    return workItemTypes.map(serializeWorkItemType)
  },
  ['work-item-types-cache-key'],
  { tags: ['work-item-types'] }
)

export async function getExternalWorkItems(): Promise<ExternalWorkItemSummary[]> {
  const items = await db.externalWorkItem.findMany({
    where: activeWorkItemWhere,
    select: externalWorkItemBaseSelect,
    orderBy: [{ workItemType: { name: 'asc' } }, { externalId: 'asc' }],
  })

  return items.map(serializeExternalWorkItem)
}

export async function getWorkItemTypes(): Promise<WorkItemTypeOption[]> {
  const workItemTypes = await db.workItemType.findMany({
    select: workItemTypeSelect,
    orderBy: { name: 'asc' },
  })

  return workItemTypes.map(serializeWorkItemType)
}

export async function getExternalWorkItemsManagementData(
  input: ExternalWorkItemsManagementInput
): Promise<ActionResult<ExternalWorkItemsManagementData>> {
  try {
    const trimmedQuery = input.query?.trim() ?? ''
    const queryNumber = /^\d+$/.test(trimmedQuery) ? Number(trimmedQuery) : null
    const requestedPage = isPositiveInteger(input.page) ? input.page! : 1
    const where: Prisma.ExternalWorkItemWhereInput = {
      ...(input.includeInactive ? {} : activeWorkItemWhere),
      ...(isPositiveInteger(input.workItemTypeId) ? { workItemTypeId: input.workItemTypeId! } : {}),
      ...(trimmedQuery
        ? {
            OR: [
              { title: { contains: trimmedQuery, mode: 'insensitive' } },
              ...(queryNumber !== null ? [{ externalId: queryNumber }] : []),
            ],
          }
        : {}),
    }

    const [total, workItemTypes] = await Promise.all([
      db.externalWorkItem.count({ where }),
      db.workItemType.findMany({
        select: workItemTypeSelect,
        orderBy: { name: 'asc' },
      }),
    ])
    const totalPages = Math.max(1, Math.ceil(total / EXTERNAL_WORK_ITEMS_PAGE_SIZE))
    const page = Math.min(requestedPage, totalPages)
    const items = await db.externalWorkItem.findMany({
      where,
      select: externalWorkItemBaseSelect,
      orderBy: [{ workItemType: { name: 'asc' } }, { externalId: 'asc' }],
      skip: (page - 1) * EXTERNAL_WORK_ITEMS_PAGE_SIZE,
      take: EXTERNAL_WORK_ITEMS_PAGE_SIZE,
    })

    return {
      success: true,
      data: {
        items: items.map(serializeExternalWorkItem),
        workItemTypes: workItemTypes.map(serializeWorkItemType),
        total,
        page,
        pageSize: EXTERNAL_WORK_ITEMS_PAGE_SIZE,
        totalPages,
      },
    }
  } catch {
    return { success: false, error: 'Error al obtener trámites' }
  }
}

interface CreateExternalWorkItemData {
  workItemTypeId: number
  externalId: number
  title: string
}

interface CreateExternalWorkItemResult {
  success: boolean
  error?: string
  data?: (
    | ExternalWorkItemSummary
    | {
        duplicateInactive: true
        item: ExternalWorkItemSummary
      }
  )
}

export async function createExternalWorkItem(data: CreateExternalWorkItemData): Promise<CreateExternalWorkItemResult> {
  const access = await requireExternalWorkItemManager()
  if (!access.success) return access

  try {
    if (!isPositiveInteger(data.workItemTypeId) || !isPositiveInteger(data.externalId) || !data.title?.trim()) {
      return { success: false, error: 'Todos los campos son requeridos' }
    }

    const workItemType = await db.workItemType.findUnique({
      where: { id: data.workItemTypeId },
      select: workItemTypeSelect,
    })

    if (!workItemType) {
      return { success: false, error: 'Tipo de trámite inválido' }
    }

    const existingItem = await db.externalWorkItem.findUnique({
      where: {
        workItemTypeId_externalId: {
          workItemTypeId: data.workItemTypeId,
          externalId: data.externalId,
        },
      },
      select: externalWorkItemBaseSelect,
    })

    if (existingItem) {
      if (existingItem.status === ExternalWorkItemStatus.INACTIVE) {
        const reactivated = await db.externalWorkItem.update({
          where: { id: existingItem.id },
          data: {
            status: ExternalWorkItemStatus.ACTIVE,
            title: data.title.trim(),
          },
          select: externalWorkItemBaseSelect,
        })

        revalidateExternalWorkItems()
        return { success: true, data: serializeExternalWorkItem(reactivated) }
      }

      return { success: false, error: 'El trámite ya existe' }
    }

    const item = await db.externalWorkItem.create({
      data: {
        workItemTypeId: data.workItemTypeId,
        externalId: data.externalId,
        title: data.title.trim(),
        status: ExternalWorkItemStatus.ACTIVE,
      },
      select: externalWorkItemBaseSelect,
    })

    revalidateExternalWorkItems()
    return { success: true, data: serializeExternalWorkItem(item) }
  } catch {
    return { success: false, error: 'Error al crear el trámite' }
  }
}

interface UpdateExternalWorkItemStatusData {
  id: number
  status: ExternalWorkItemStatus
  title?: string
}

interface UpdateExternalWorkItemStatusResult {
  success: boolean
  error?: string
  data?: ExternalWorkItemSummary
}

export async function updateExternalWorkItemStatus(data: UpdateExternalWorkItemStatusData): Promise<UpdateExternalWorkItemStatusResult> {
  const access = await requireExternalWorkItemManager()
  if (!access.success) return access

  try {
    const existing = await db.externalWorkItem.findUnique({
      where: { id: data.id },
      select: externalWorkItemBaseSelect,
    })

    if (!existing) {
      return { success: false, error: 'El trámite no existe' }
    }

    const updated = await db.externalWorkItem.update({
      where: { id: data.id },
      data: {
        status: data.status,
        ...(data.title !== undefined ? { title: data.title.trim() || null } : {}),
      },
      select: externalWorkItemBaseSelect,
    })

    revalidateExternalWorkItems()
    return { success: true, data: serializeExternalWorkItem(updated) }
  } catch {
    return { success: false, error: 'Error al guardar el trámite' }
  }
}

export async function deleteExternalWorkItem(id: number): Promise<ActionResult> {
  const access = await requireExternalWorkItemManager()
  if (!access.success) return access

  try {
    await db.externalWorkItem.delete({ where: { id } })

    revalidateExternalWorkItems()
    return { success: true }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
      return { success: false, error: 'No se puede eliminar: el trámite tiene incidencias relacionadas' }
    }
    return { success: false, error: 'Error al eliminar el trámite' }
  }
}

interface CreateWorkItemTypeData {
  name: string
  color?: WorkItemTypeColor | null
}

export async function createWorkItemType(data: CreateWorkItemTypeData): Promise<ActionResult<WorkItemTypeOption>> {
  const access = await requireExternalWorkItemManager()
  if (!access.success) return access

  try {
    const normalizedName = data.name.trim()
    if (!normalizedName) {
      return { success: false, error: 'El nombre es requerido' }
    }

    const selectedColor = data.color ?? null

    if (selectedColor && !allowedColors.has(selectedColor)) {
      return { success: false, error: 'El color seleccionado no es válido' }
    }

    const totalTypes = await db.workItemType.count()
    if (totalTypes >= WORK_ITEM_TYPE_COLOR_LIMIT) {
      return { success: false, error: 'Solo se permiten 5 tipos de trámite' }
    }

    const workItemType = await db.workItemType.create({
      data: { name: normalizedName, color: selectedColor },
      select: workItemTypeSelect,
    })

    revalidateTag('work-item-types', 'default')
    revalidateExternalWorkItems()
    return { success: true, data: serializeWorkItemType(workItemType) }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
      return { success: false, error: 'El nombre o color del tipo de trámite ya existe' }
    }
    return { success: false, error: 'Error al crear el tipo de trámite' }
  }
}

export async function deleteWorkItemType(id: number): Promise<ActionResult> {
  const access = await requireExternalWorkItemManager()
  if (!access.success) return access

  try {
    const existing = await db.workItemType.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: 'El tipo de trámite no existe' }
    }

    await db.workItemType.delete({ where: { id } })

    revalidateTag('work-item-types', 'default')
    revalidateExternalWorkItems()
    return { success: true }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
      return { success: false, error: 'No se puede eliminar: tiene trámites asociados' }
    }
    return { success: false, error: 'Error al eliminar el tipo de trámite' }
  }
}
