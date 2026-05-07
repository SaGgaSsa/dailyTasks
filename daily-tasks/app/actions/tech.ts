'use server'

import { Prisma, Technology, Module, UserRole } from '@prisma/client'
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache'

import { auth } from '@/auth'
import { db } from '@/lib/db'

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

interface TechnologyInput {
  name: string
}

interface UpdateTechnologyInput extends TechnologyInput {
  id: number
}

interface ModuleInput {
  name: string
  technologyId: number
}

interface UpdateModuleInput extends ModuleInput {
  id: number
}

type ActionResult<T = undefined> = {
  success: boolean
  error?: string
  data?: T
}

const TECH_TAG = 'tecnologias'
const MODULE_TAG = 'modulos'

async function getTechsWithModulesFromDb(): Promise<CachedTechsResult> {
  const techs = await db.technology.findMany({
    orderBy: { name: 'asc' },
    include: {
      modules: {
        orderBy: { name: 'asc' },
      },
    },
  })

  const allModules = techs.flatMap((technology) => technology.modules)
  const defaultTech = techs.find((technology) => technology.isDefault) || techs[0] || null

  const defaultModules: DefaultModule[] = []
  techs.forEach((technology) => {
    const defaultModule = technology.modules.find((moduleRecord) => moduleRecord.isDefault)
    if (defaultModule) {
      defaultModules.push({ techId: technology.id, module: defaultModule })
    } else if (technology.modules.length > 0) {
      defaultModules.push({ techId: technology.id, module: technology.modules[0] })
    }
  })

  return { techs, allModules, defaultTech, defaultModules }
}

export const getCachedTechsWithModules = unstable_cache(
  getTechsWithModulesFromDb,
  ['techs-modules-cache-key'],
  { tags: [TECH_TAG, MODULE_TAG] }
)

export async function getTechsAndModulesForSettings(): Promise<ActionResult<CachedTechsResult>> {
  try {
    const data = await getTechsWithModulesFromDb()
    return { success: true, data }
  } catch {
    return { success: false, error: 'Error al obtener tecnologías y módulos' }
  }
}

async function requireManagerRole(): Promise<ActionResult> {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: 'No autorizado' }
  }

  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.QA) {
    return { success: false, error: 'Solo administradores y QA pueden modificar esta configuración' }
  }

  return { success: true }
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function slugifyModuleName(name: string) {
  return normalizeName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function createUniqueModuleSlug(name: string) {
  const baseSlug = slugifyModuleName(name)

  if (!baseSlug) {
    return ''
  }

  let slug = baseSlug
  let suffix = 1

  while (await db.module.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  return slug
}

function validateTechnologyInput(data: TechnologyInput) {
  const name = normalizeName(data.name)

  if (!name) {
    return { success: false, error: 'El nombre es requerido' } as const
  }

  return { success: true, name } as const
}

function validateModuleInput(data: ModuleInput) {
  const name = normalizeName(data.name)

  if (!name) {
    return { success: false, error: 'El nombre es requerido' } as const
  }

  if (!Number.isInteger(data.technologyId) || data.technologyId <= 0) {
    return { success: false, error: 'La tecnología es requerida' } as const
  }

  return {
    success: true,
    name,
    technologyId: data.technologyId,
  } as const
}

function revalidateTechCaches() {
  revalidateTag(TECH_TAG, 'default')
  revalidateTag(MODULE_TAG, 'default')
  revalidatePath('/incidences')
  revalidatePath('/tracklists')
}

function withoutData<T>(result: ActionResult): ActionResult<T> {
  return {
    success: result.success,
    error: result.error,
  }
}

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
}

function getDeleteTechnologyError(error: unknown) {
  if (isPrismaError(error, 'P2003')) {
    return 'No se puede eliminar la tecnología porque tiene incidencias asociadas o módulos usados en tickets'
  }

  return 'Error al eliminar la tecnología'
}

function getDeleteModuleError(error: unknown) {
  if (isPrismaError(error, 'P2003')) {
    return 'No se puede eliminar el módulo porque tiene tickets asociados'
  }

  return 'Error al eliminar el módulo'
}

export async function createTechnology(data: TechnologyInput): Promise<ActionResult<Technology>> {
  const authorization = await requireManagerRole()
  if (!authorization.success) {
    return withoutData<Technology>(authorization)
  }

  const validation = validateTechnologyInput(data)
  if (!validation.success) {
    return withoutData<Technology>(validation)
  }

  try {
    const technology = await db.technology.create({
      data: {
        name: validation.name,
      },
    })

    revalidateTechCaches()
    return { success: true, data: technology }
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return { success: false, error: 'La tecnología ya existe' }
    }

    return { success: false, error: 'Error al crear la tecnología' }
  }
}

export async function updateTechnology(data: UpdateTechnologyInput): Promise<ActionResult<Technology>> {
  const authorization = await requireManagerRole()
  if (!authorization.success) {
    return withoutData<Technology>(authorization)
  }

  if (!Number.isInteger(data.id) || data.id <= 0) {
    return { success: false, error: 'La tecnología no es válida' }
  }

  const validation = validateTechnologyInput(data)
  if (!validation.success) {
    return withoutData<Technology>(validation)
  }

  try {
    const existing = await db.technology.findUnique({ where: { id: data.id } })
    if (!existing) {
      return { success: false, error: 'La tecnología no existe' }
    }

    const technology = await db.technology.update({
      where: { id: data.id },
      data: {
        name: validation.name,
      },
    })

    revalidateTechCaches()
    return { success: true, data: technology }
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return { success: false, error: 'La tecnología ya existe' }
    }

    return { success: false, error: 'Error al actualizar la tecnología' }
  }
}

export async function deleteTechnology(id: number): Promise<ActionResult> {
  const authorization = await requireManagerRole()
  if (!authorization.success) {
    return authorization
  }

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: 'La tecnología no es válida' }
  }

  try {
    const existing = await db.technology.findUnique({
      where: { id },
      include: {
        modules: true,
      },
    })

    if (!existing) {
      return { success: false, error: 'La tecnología no existe' }
    }

    const incidenceInUse = await db.incidence.findFirst({
      where: { technologyId: id },
      select: { id: true },
    })

    if (incidenceInUse) {
      return { success: false, error: 'No se puede eliminar la tecnología porque tiene incidencias asociadas o módulos usados en tickets' }
    }

    const moduleIds = existing.modules.map((moduleRecord) => moduleRecord.id)
    if (moduleIds.length > 0) {
      const moduleInUse = await db.ticketQA.findFirst({
        where: { moduleId: { in: moduleIds } },
        select: { id: true },
      })

      if (moduleInUse) {
        return { success: false, error: 'No se puede eliminar la tecnología porque tiene incidencias asociadas o módulos usados en tickets' }
      }
    }

    await db.technology.delete({
      where: { id },
    })

    revalidateTechCaches()
    return { success: true }
  } catch (error) {
    return { success: false, error: getDeleteTechnologyError(error) }
  }
}

export async function createModule(data: ModuleInput): Promise<ActionResult<Module>> {
  const authorization = await requireManagerRole()
  if (!authorization.success) {
    return withoutData<Module>(authorization)
  }

  const validation = validateModuleInput(data)
  if (!validation.success) {
    return withoutData<Module>(validation)
  }

  const slug = await createUniqueModuleSlug(validation.name)
  if (!slug) {
    return { success: false, error: 'No se pudo generar un slug válido para el módulo' }
  }

  try {
    const moduleRecord = await db.module.create({
      data: {
        name: validation.name,
        slug,
        technologyId: validation.technologyId,
      },
    })

    revalidateTechCaches()
    return { success: true, data: moduleRecord }
  } catch (error) {
    if (isPrismaError(error, 'P2003')) {
      return { success: false, error: 'La tecnología seleccionada no existe' }
    }

    if (isPrismaError(error, 'P2002')) {
      return { success: false, error: 'El módulo ya existe' }
    }

    return { success: false, error: 'Error al crear el módulo' }
  }
}

export async function updateModule(data: UpdateModuleInput): Promise<ActionResult<Module>> {
  const authorization = await requireManagerRole()
  if (!authorization.success) {
    return withoutData<Module>(authorization)
  }

  if (!Number.isInteger(data.id) || data.id <= 0) {
    return { success: false, error: 'El módulo no es válido' }
  }

  const validation = validateModuleInput(data)
  if (!validation.success) {
    return withoutData<Module>(validation)
  }

  try {
    const existing = await db.module.findUnique({ where: { id: data.id } })
    if (!existing) {
      return { success: false, error: 'El módulo no existe' }
    }

    const moduleRecord = await db.module.update({
      where: { id: data.id },
      data: {
        name: validation.name,
        technologyId: validation.technologyId,
      },
    })

    revalidateTechCaches()
    return { success: true, data: moduleRecord }
  } catch (error) {
    if (isPrismaError(error, 'P2003')) {
      return { success: false, error: 'La tecnología seleccionada no existe' }
    }

    return { success: false, error: 'Error al actualizar el módulo' }
  }
}

export async function deleteModule(id: number): Promise<ActionResult> {
  const authorization = await requireManagerRole()
  if (!authorization.success) {
    return authorization
  }

  if (!Number.isInteger(id) || id <= 0) {
    return { success: false, error: 'El módulo no es válido' }
  }

  try {
    const existing = await db.module.findUnique({ where: { id } })
    if (!existing) {
      return { success: false, error: 'El módulo no existe' }
    }

    const ticketInUse = await db.ticketQA.findFirst({
      where: { moduleId: id },
      select: { id: true },
    })

    if (ticketInUse) {
      return { success: false, error: 'No se puede eliminar el módulo porque tiene tickets asociados' }
    }

    await db.module.delete({
      where: { id },
    })

    revalidateTechCaches()
    return { success: true }
  } catch (error) {
    return { success: false, error: getDeleteModuleError(error) }
  }
}
