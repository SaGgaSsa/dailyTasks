'use server'

import { Environment, Prisma, UserRole } from '@prisma/client'

import { auth } from '@/auth'
import { db } from '@/lib/db'

interface EnvironmentInput {
  name: string
}

interface UpdateEnvironmentInput extends EnvironmentInput {
  id: number
}

interface EnvironmentEnabledInput {
  id: number
  isEnabled: boolean
}

type ActionResult<T = undefined> = {
  success: boolean
  error?: string
  data?: T
}

export async function getEnvironmentsForSettings(): Promise<ActionResult<Environment[]>> {
  try {
    const environments = await db.environment.findMany({
      orderBy: { name: 'asc' },
    })
    return { success: true, data: environments }
  } catch {
    return { success: false, error: 'Error al obtener ambientes' }
  }
}

async function requireAdminRole(): Promise<ActionResult> {
  const session = await auth()

  if (!session?.user) {
    return { success: false, error: 'No autorizado' }
  }

  if (session.user.role !== UserRole.ADMIN) {
    return { success: false, error: 'Solo administradores pueden modificar ambientes' }
  }

  return { success: true }
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function validateEnvironmentInput(data: EnvironmentInput) {
  const name = normalizeName(data.name)

  if (!name) {
    return { success: false, error: 'El nombre es requerido' } as const
  }

  return { success: true, name } as const
}

function validateEnvironmentId(id: number) {
  return Number.isInteger(id) && id > 0
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

export async function createEnvironment(data: EnvironmentInput): Promise<ActionResult<Environment>> {
  const authorization = await requireAdminRole()
  if (!authorization.success) {
    return withoutData<Environment>(authorization)
  }

  const validation = validateEnvironmentInput(data)
  if (!validation.success) {
    return withoutData<Environment>(validation)
  }

  try {
    const environment = await db.environment.create({
      data: {
        name: validation.name,
      },
    })

    return { success: true, data: environment }
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return { success: false, error: 'El ambiente ya existe' }
    }

    return { success: false, error: 'Error al crear el ambiente' }
  }
}

export async function updateEnvironment(data: UpdateEnvironmentInput): Promise<ActionResult<Environment>> {
  const authorization = await requireAdminRole()
  if (!authorization.success) {
    return withoutData<Environment>(authorization)
  }

  if (!validateEnvironmentId(data.id)) {
    return { success: false, error: 'El ambiente no es válido' }
  }

  const validation = validateEnvironmentInput(data)
  if (!validation.success) {
    return withoutData<Environment>(validation)
  }

  try {
    const existing = await db.environment.findUnique({ where: { id: data.id } })
    if (!existing) {
      return { success: false, error: 'El ambiente no existe' }
    }

    const environment = await db.environment.update({
      where: { id: data.id },
      data: {
        name: validation.name,
      },
    })

    return { success: true, data: environment }
  } catch (error) {
    if (isPrismaError(error, 'P2002')) {
      return { success: false, error: 'El ambiente ya existe' }
    }

    return { success: false, error: 'Error al actualizar el ambiente' }
  }
}

export async function setEnvironmentEnabled(data: EnvironmentEnabledInput): Promise<ActionResult<Environment>> {
  const authorization = await requireAdminRole()
  if (!authorization.success) {
    return withoutData<Environment>(authorization)
  }

  if (!validateEnvironmentId(data.id)) {
    return { success: false, error: 'El ambiente no es válido' }
  }

  if (typeof data.isEnabled !== 'boolean') {
    return { success: false, error: 'El estado del ambiente no es válido' }
  }

  try {
    const existing = await db.environment.findUnique({ where: { id: data.id } })
    if (!existing) {
      return { success: false, error: 'El ambiente no existe' }
    }

    const environment = await db.environment.update({
      where: { id: data.id },
      data: {
        isEnabled: data.isEnabled,
      },
    })

    return { success: true, data: environment }
  } catch {
    return { success: false, error: 'Error al actualizar el ambiente' }
  }
}
