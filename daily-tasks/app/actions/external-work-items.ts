'use server'

import { unstable_cache, revalidateTag } from 'next/cache'
import { ExternalWorkItemStatus } from '.prisma/client'
import { db } from '@/lib/db'
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

export async function getExternalWorkItemsSettingsData(): Promise<{
  workItems: ExternalWorkItemSummary[]
  workItemTypes: WorkItemTypeOption[]
}> {
  const [items, workItemTypes] = await Promise.all([
    db.externalWorkItem.findMany({
      where: activeWorkItemWhere,
      select: externalWorkItemBaseSelect,
      orderBy: [{ workItemType: { name: 'asc' } }, { externalId: 'asc' }],
    }),
    db.workItemType.findMany({
      select: workItemTypeSelect,
      orderBy: { name: 'asc' },
    }),
  ])

  return {
    workItems: items.map(serializeExternalWorkItem),
    workItemTypes: workItemTypes.map(serializeWorkItemType),
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
  try {
    if (!data.workItemTypeId || !data.externalId || !data.title?.trim()) {
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
        return {
          success: false,
          error: 'El trámite ya existe y está inactivo',
          data: {
            duplicateInactive: true,
            item: serializeExternalWorkItem(existingItem),
          },
        }
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

    revalidateTag('external-work-items', 'default')
    return { success: true, data: serializeExternalWorkItem(item) }
  } catch (error) {
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

    revalidateTag('external-work-items', 'default')
    return { success: true, data: serializeExternalWorkItem(updated) }
  } catch (error) {
    return { success: false, error: 'Error al guardar el trámite' }
  }
}

interface CreateWorkItemTypeData {
  name: string
  color?: WorkItemTypeColor | null
}

export async function createWorkItemType(data: CreateWorkItemTypeData) {
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
    revalidateTag('external-work-items', 'default')
    return { success: true, data: serializeWorkItemType(workItemType) }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
      return { success: false, error: 'El nombre o color del tipo de trámite ya existe' }
    }
    return { success: false, error: 'Error al crear el tipo de trámite' }
  }
}

export async function deleteWorkItemType(id: number) {
  try {
    const existing = await db.workItemType.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: 'El tipo de trámite no existe' }
    }

    await db.workItemType.delete({ where: { id } })

    revalidateTag('work-item-types', 'default')
    revalidateTag('external-work-items', 'default')
    return { success: true }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
      return { success: false, error: 'No se puede eliminar: tiene trámites asociados' }
    }
    return { success: false, error: 'Error al eliminar el tipo de trámite' }
  }
}
