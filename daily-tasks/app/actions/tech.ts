'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { Technology } from '@/types/index'

export const getCachedTechs = unstable_cache(
  async (): Promise<Technology[]> => {
    return await db.technology.findMany({
      orderBy: { name: 'asc' }
    })
  },
  ['techs-cache-key'],
  { tags: ['tecnologias'] }
)
