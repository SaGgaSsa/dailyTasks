'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { ExternalWorkItem } from '@prisma/client'

export const getCachedExternalWorkItems = unstable_cache(
  async (): Promise<ExternalWorkItem[]> => {
    return db.externalWorkItem.findMany({
      orderBy: [{ type: 'asc' }, { externalId: 'asc' }],
    })
  },
  ['external-work-items-cache-key'],
  { tags: ['external-work-items'] }
)
