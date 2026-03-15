'use server'

import { unstable_cache, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { ExternalWorkItem, TaskType } from '@prisma/client'

export const getCachedExternalWorkItems = unstable_cache(
  async (): Promise<ExternalWorkItem[]> => {
    return db.externalWorkItem.findMany({
      orderBy: [{ type: 'asc' }, { externalId: 'asc' }],
    })
  },
  ['external-work-items-cache-key'],
  { tags: ['external-work-items'] }
)

interface CreateExternalWorkItemData {
  type: TaskType
  externalId: number
  title: string
}

export async function createExternalWorkItem(data: CreateExternalWorkItemData) {
  try {
    if (!data.type || !data.externalId || !data.title?.trim()) {
      return { success: false, error: 'Todos los campos son requeridos' }
    }

    const item = await db.externalWorkItem.create({
      data: {
        type: data.type,
        externalId: data.externalId,
        title: data.title.trim(),
      },
    })

    revalidateTag('external-work-items', 'default')
    return { success: true, data: item }
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
