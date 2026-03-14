'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { Technology, Module } from '@prisma/client'

interface TechWithModules extends Technology {
  modules: Module[]
}

interface DefaultModule {
  techId: number
  module: Module
}

interface CachedTechsResult {
  techs: TechWithModules[]
  allModules: Module[]
  defaultTech: Technology | null
  defaultModules: DefaultModule[]
}

export const getCachedTechsWithModules = unstable_cache(
  async (): Promise<CachedTechsResult> => {
    const techs = await db.technology.findMany({
      orderBy: { name: 'asc' },
      include: {
        modules: {
          orderBy: { name: 'asc' }
        }
      }
    })
    const allModules = await db.module.findMany({
      orderBy: { name: 'asc' }
    })
    
    const defaultTech = techs.find(t => t.isDefault) || (techs.length > 0 ? techs[0] : null)
    
    const defaultModules: DefaultModule[] = []
    techs.forEach(tech => {
      const defaultMod = tech.modules.find(m => m.isDefault)
      if (defaultMod) {
        defaultModules.push({ techId: tech.id, module: defaultMod })
      } else if (tech.modules.length > 0) {
        defaultModules.push({ techId: tech.id, module: tech.modules[0] })
      }
    })
    
    return { techs, allModules, defaultTech, defaultModules }
  },
  ['techs-modules-cache-key'],
  { tags: ['tecnologias', 'modulos'] }
)
