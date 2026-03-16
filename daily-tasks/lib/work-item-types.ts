import { Prisma } from '@prisma/client'

export const externalWorkItemBaseSelect = {
  id: true,
  externalId: true,
  title: true,
  workItemTypeId: true,
  workItemType: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.ExternalWorkItemSelect

export type ExternalWorkItemBaseRecord = Prisma.ExternalWorkItemGetPayload<{
  select: typeof externalWorkItemBaseSelect
}>

export function serializeExternalWorkItem<T extends ExternalWorkItemBaseRecord>(item: T) {
  return {
    ...item,
    type: item.workItemType.name,
  }
}
