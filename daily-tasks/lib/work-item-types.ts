import { Prisma } from '@prisma/client'
import type { ExternalWorkItemSummary, WorkItemTypeOption } from '@/types'

export const externalWorkItemBaseSelect = {
  id: true,
  externalId: true,
  title: true,
  workItemTypeId: true,
  workItemType: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
} satisfies Prisma.ExternalWorkItemSelect

export type ExternalWorkItemBaseRecord = Prisma.ExternalWorkItemGetPayload<{
  select: typeof externalWorkItemBaseSelect
}>

export function serializeWorkItemType<T extends { id: number; name: string; color: string | null }>(item: T): T & WorkItemTypeOption {
  return {
    ...item,
    color: item.color,
  }
}

export function serializeExternalWorkItem<T extends ExternalWorkItemBaseRecord>(item: T): T & Pick<ExternalWorkItemSummary, 'type' | 'color'> {
  return {
    ...item,
    type: item.workItemType.name,
    color: item.workItemType.color,
    workItemType: serializeWorkItemType(item.workItemType),
  }
}
