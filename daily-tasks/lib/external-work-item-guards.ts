import { ExternalWorkItemStatus } from '.prisma/client'

import { db } from '@/lib/db'
import { externalWorkItemBaseSelect } from '@/lib/work-item-types'

export async function getExternalWorkItemById(id: number) {
  return db.externalWorkItem.findUnique({
    where: { id },
    select: externalWorkItemBaseSelect,
  })
}

export async function getExternalWorkItemByComposite(workItemTypeId: number, externalId: number) {
  return db.externalWorkItem.findUnique({
    where: {
      workItemTypeId_externalId: {
        workItemTypeId,
        externalId,
      },
    },
    select: externalWorkItemBaseSelect,
  })
}

export function isExternalWorkItemActive(
  workItem: { status: ExternalWorkItemStatus } | null | undefined
): boolean {
  return workItem?.status === ExternalWorkItemStatus.ACTIVE
}
