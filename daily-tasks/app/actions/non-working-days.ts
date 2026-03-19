'use server'

import { unstable_cache, revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { canManageNonWorkingDays, getAuthenticatedUser } from '@/lib/authorization'

export const getCachedNonWorkingDays = unstable_cache(
  async (): Promise<Date[]> => fetchNonWorkingDays(),
  ['non-working-days-cache-key'],
  { tags: ['non-working-days'] }
)

async function fetchNonWorkingDays(): Promise<Date[]> {
  const rows = await db.nonWorkingDay.findMany({
    select: { date: true },
    orderBy: { date: 'asc' },
  })
  return rows.map((r) => r.date)
}

export async function getNonWorkingDays(): Promise<{ success: boolean; data?: Date[]; error?: string }> {
  try {
    const data = await fetchNonWorkingDays()
    return { success: true, data }
  } catch {
    return { success: false, error: 'Error al obtener los días no laborables' }
  }
}

function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

export async function syncNonWorkingDays(dates: Date[]): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser()
  if (!user) {
    return { success: false, error: 'No autorizado' }
  }

  if (!canManageNonWorkingDays(user.role)) {
    return { success: false, error: 'No tiene permisos para guardar los días no laborables' }
  }

  try {
    const uniqueDates = [
      ...new Map(
        dates.map((d) => {
          const utc = toUTCMidnight(d)
          return [utc.toISOString(), utc] as const
        })
      ).values(),
    ]
    await db.$transaction(async (tx) => {
      await tx.nonWorkingDay.deleteMany()
      if (uniqueDates.length > 0) {
        await tx.nonWorkingDay.createMany({
          data: uniqueDates.map((date) => ({ date })),
        })
      }
    })
    revalidateTag('non-working-days', 'default')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al guardar los días no laborables' }
  }
}
