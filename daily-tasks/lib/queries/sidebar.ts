import { Priority, TaskStatus } from '@prisma/client'
import { getSidebarFavoriteEnvironments } from '@/app/actions/environment-log'
import { getTracklists } from '@/app/actions/tracklists'
import { db } from '@/lib/db'

export interface SidebarTracklistSummary {
  id: number
  title: string
}

export interface SidebarIncidenceSummary {
  id: number
  label: string
}

export interface SidebarEnvironmentSummary {
  id: number
  name: string
}

interface SidebarData {
  tracklists: SidebarTracklistSummary[]
  blockerIncidences: SidebarIncidenceSummary[]
  favoriteEnvironments: SidebarEnvironmentSummary[]
}

function buildIncidenceLabel(incidence: {
  id: number
  description: string
  externalWorkItem: { externalId: number; workItemType: { name: string } } | null
}) {
  return incidence.description
}

export async function getSidebarData(userId?: string): Promise<SidebarData> {
  const numericUserId = Number(userId)

  const [tracklistsResult, favoriteEnvironmentsResult, blockerIncidences] = await Promise.all([
    getTracklists(),
    getSidebarFavoriteEnvironments(),
    Number.isNaN(numericUserId)
      ? Promise.resolve([])
      : db.incidence.findMany({
          where: {
            priority: Priority.BLOCKER,
            status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
            assignments: {
              some: {
                userId: numericUserId,
                isAssigned: true,
              },
            },
          },
          select: {
            id: true,
            description: true,
            externalWorkItem: {
              select: {
                externalId: true,
                workItemType: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { status: 'asc' },
            { updatedAt: 'desc' },
          ],
        }),
  ])

  return {
    tracklists:
      tracklistsResult.success && tracklistsResult.data
        ? tracklistsResult.data.map((tl) => ({ id: tl.id, title: tl.title }))
        : [],
    favoriteEnvironments:
      favoriteEnvironmentsResult.success && favoriteEnvironmentsResult.data
        ? favoriteEnvironmentsResult.data
        : [],
    blockerIncidences: blockerIncidences.map((incidence) => ({
      id: incidence.id,
      label: buildIncidenceLabel(incidence),
    })),
  }
}
