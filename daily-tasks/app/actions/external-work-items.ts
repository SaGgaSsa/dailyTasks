'use server'

import { unstable_cache, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { externalWorkItemBaseSelect, serializeExternalWorkItem } from '@/lib/work-item-types'
import { ExternalWorkItemSummary, WorkItemTypeOption } from '@/types'

const workItemTypeSelect = {
  id: true,
  name: true,
} as const

export const getCachedExternalWorkItems = unstable_cache(
  async (): Promise<ExternalWorkItemSummary[]> => {
    const items = await db.externalWorkItem.findMany({
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
    return db.workItemType.findMany({
      select: workItemTypeSelect,
      orderBy: { name: 'asc' },
    })
  },
  ['work-item-types-cache-key'],
  { tags: ['work-item-types'] }
)

export async function getExternalWorkItems(): Promise<ExternalWorkItemSummary[]> {
  const items = await db.externalWorkItem.findMany({
    select: externalWorkItemBaseSelect,
    orderBy: [{ workItemType: { name: 'asc' } }, { externalId: 'asc' }],
  })

  return items.map(serializeExternalWorkItem)
}

export async function getWorkItemTypes(): Promise<WorkItemTypeOption[]> {
  return db.workItemType.findMany({
    select: workItemTypeSelect,
    orderBy: { name: 'asc' },
  })
}

interface CreateExternalWorkItemData {
  workItemTypeId: number
  externalId: number
  title: string
}

export async function createExternalWorkItem(data: CreateExternalWorkItemData) {
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

    const item = await db.externalWorkItem.create({
      data: {
        workItemTypeId: data.workItemTypeId,
        externalId: data.externalId,
        title: data.title.trim(),
      },
      select: externalWorkItemBaseSelect,
    })

    revalidateTag('external-work-items', 'default')
    return { success: true, data: serializeExternalWorkItem(item) }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
      return { success: false, error: 'El trámite ya existe' }
    }
    return { success: false, error: 'Error al crear el trámite' }
  }
}

export async function deleteExternalWorkItem(id: number) {
  try {
    const existing = await db.externalWorkItem.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: 'El trámite no existe' }
    }

    await db.externalWorkItem.delete({ where: { id } })

    revalidateTag('external-work-items', 'default')
    return { success: true }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2003') {
      return { success: false, error: 'No se puede eliminar: tiene incidencias asociadas' }
    }
    return { success: false, error: 'Error al eliminar el trámite' }
  }
}

export async function createWorkItemType(name: string) {
  try {
    const normalizedName = name.trim()
    if (!normalizedName) {
      return { success: false, error: 'El nombre es requerido' }
    }

    const workItemType = await db.workItemType.create({
      data: { name: normalizedName },
      select: workItemTypeSelect,
    })

    revalidateTag('work-item-types', 'default')
    revalidateTag('external-work-items', 'default')
    return { success: true, data: workItemType }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as Record<string, unknown>).code === 'P2002') {
      return { success: false, error: 'El tipo de trámite ya existe' }
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
