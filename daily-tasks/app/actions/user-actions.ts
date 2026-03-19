'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { createUserSchema, updateUserSchema } from '@/types'
import bcrypt from 'bcryptjs'
import { serializeExternalWorkItem } from '@/lib/work-item-types'
import { canManageUsers, getAuthenticatedUser } from '@/lib/authorization'

type ActionResult<T = undefined> = {
    success: boolean
    error?: string
    data?: T
}

export interface AdminUserSummary {
    id: number
    email: string
    name: string | null
    username: string
    role: UserRole
    createdAt: Date
    updatedAt: Date
}

export interface UserDetailsPayload {
    id: number
    email: string
    name: string | null
    username: string
    role: UserRole
    createdAt: Date
    updatedAt: Date
    metrics: {
        totalTasks: number
        pendingTasks: number
        completedTasks: number
    }
    recentIncidences: Array<{
        id: number
        description: string
        status: string
        priority: string
        updatedAt: Date
        externalWorkItem: ReturnType<typeof serializeExternalWorkItem> | null
    }>
}

function unauthorizedResult<T>(): ActionResult<T> {
    return { success: false, error: 'No autorizado' }
}

export async function getUsers(): Promise<ActionResult<AdminUserSummary[]>> {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return unauthorizedResult<AdminUserSummary[]>()
    }

    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { username: 'asc' }
        })
        return { success: true, data: users }
    } catch (error) {
        console.error('Error getting users:', error)
        return { success: false, error: 'Error al obtener los usuarios' }
    }
}

interface UpsertUserData {
    id?: number
    username: string
    name: string
    email: string
    password: string
    role: UserRole
    technologies: { connect: { name: string } }[]
}

export async function upsertUser(data: UpsertUserData) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return unauthorizedResult()
    }

    const technologyNames = data.technologies.map((technology) => technology.connect.name)
    const schema = data.id ? updateUserSchema : createUserSchema
    const validation = schema.safeParse({
        username: data.username,
        name: data.name,
        email: data.email,
        ...(data.id ? {} : { password: data.password }),
        role: data.role,
        technologies: technologyNames,
    })

    if (!validation.success) {
        const errors = validation.error.issues.map(e => e.message).join(', ')
        return { success: false, error: errors }
    }

    const normalizedData = validation.data

    try {
        if (data.id) {
            await db.user.update({
                where: { id: data.id },
                data: {
                    username: normalizedData.username,
                    name: normalizedData.name,
                    email: normalizedData.email,
                    role: normalizedData.role,
                    ...(technologyNames.length > 0
                        ? { technologies: { set: technologyNames.map((name) => ({ name })) } }
                        : { technologies: { set: [] } }),
                }
            })
            revalidatePath('/dashboard')
            return { success: true }
        } else {
            const hashedPassword = await bcrypt.hash(data.password, 10)
            await db.user.create({
                data: {
                    username: normalizedData.username,
                    name: normalizedData.name,
                    email: normalizedData.email,
                    password: hashedPassword,
                    role: normalizedData.role,
                    ...(technologyNames.length > 0 && {
                        technologies: { connect: technologyNames.map((name) => ({ name })) },
                    }),
                }
            })
            revalidatePath('/dashboard')
            return { success: true }
        }
    } catch (error) {
        console.error('Error upserting user:', error)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: 'El usuario ya existe' }
        }
        return { success: false, error: 'Error al guardar el usuario' }
    }
}

export async function createUser(formData: FormData) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return unauthorizedResult()
    }

    const username = formData.get('username') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as UserRole
    const techNames = formData.getAll('technologies') as string[]

    const validation = createUserSchema.safeParse({
        username,
        name,
        email,
        password,
        role,
        technologies: techNames,
    })

    if (!validation.success) {
        const errors = validation.error.issues.map(e => e.message).join(', ')
        return { success: false, error: errors }
    }

    const normalizedData = validation.data
    
    const techIds = await Promise.all(
        techNames.map(name => db.technology.findUnique({ where: { name } }))
    )
    const technologies = techIds.filter((t): t is NonNullable<typeof t> => t !== null).map(t => ({ connect: { id: t.id } }))

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        await db.user.create({
            data: {
                username: normalizedData.username,
                name: normalizedData.name,
                email: normalizedData.email,
                password: hashedPassword,
                role: normalizedData.role,
                technologies: technologies as never,
            }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error creating user:', error)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: 'El usuario ya existe' }
        }
        return { success: false, error: 'Error al crear el usuario' }
    }
}

export async function getUserByUsername(username: string): Promise<ActionResult<AdminUserSummary>> {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return unauthorizedResult<AdminUserSummary>()
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { username },
            select: {
                id: true,
                email: true,
                name: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            }
        })
        if (!existingUser) {
            return { success: false, error: 'Usuario no encontrado' }
        }
        return { success: true, data: existingUser }
    } catch (error) {
        console.error('Error getting user by username:', error)
        return { success: false, error: 'Error al obtener el usuario' }
    }
}

export async function getUserById(id: number) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return unauthorizedResult()
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { id }
        })
        if (!existingUser) {
            return { success: false, error: 'Usuario no encontrado' }
        }
        return { success: true, data: existingUser }
    } catch (error) {
        console.error('Error getting user by id:', error)
        return { success: false, error: 'Error al obtener el usuario' }
    }
}

export async function getUserWithTechnologies(id: number) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return unauthorizedResult()
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { id },
            include: {
                technologies: true
            }
        })
        if (!existingUser) {
            return { success: false, error: 'Usuario no encontrado' }
        }
        return { success: true, data: existingUser }
    } catch (error) {
        console.error('Error getting user with technologies:', error)
        return { success: false, error: 'Error al obtener el usuario' }
    }
}

export async function updateUserPassword(formData: FormData) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return { success: false, error: 'No autorizado' }
    }

    const userId = Number(formData.get('userId'))
    const newPassword = formData.get('newPassword') as string
    
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    try {
        await db.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        })
        return { success: true }
    } catch (error) {
        console.error('Error updating user password:', error)
        return { success: false, error: 'Error al actualizar la contraseña' }
    }
}

export async function deleteUser(userId: number) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        await db.user.delete({
            where: { id: userId }
        })
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting user:', error)
        return { success: false, error: 'Error al eliminar el usuario' }
    }
}

export async function getUserDetails(userId: number) {
  const user = await getAuthenticatedUser()
  if (!user || !canManageUsers(user.role)) {
    return unauthorizedResult<UserDetailsPayload>()
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        assignments: {
          include: {
            incidence: { include: { externalWorkItem: { include: { workItemType: true } } } },
            tasks: {
              select: {
                id: true,
                isCompleted: true,
              },
            },
          },
          orderBy: { incidence: { updatedAt: 'desc' } },
          take: 5,
        },
      },
    })

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    const activeAssignments = user.assignments.filter((assignment) => assignment.isAssigned)
    const assignedIncidences = activeAssignments.map((a) => ({
      ...a.incidence,
      externalWorkItem: a.incidence.externalWorkItem ? serializeExternalWorkItem(a.incidence.externalWorkItem) : null,
    }))
    const realTasks = activeAssignments.flatMap((assignment) => assignment.tasks)
    const totalTasks = realTasks.length
    const pendingTasks = realTasks.filter((task) => !task.isCompleted).length
    const completedTasks = realTasks.filter((task) => task.isCompleted).length

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        metrics: {
          totalTasks,
          pendingTasks,
          completedTasks,
        },
        recentIncidences: assignedIncidences,
      },
    }
  } catch (error) {
    console.error('Error getting user details:', error)
    return { success: false, error: 'Error al obtener el detalle del usuario' }
  }
}

export interface AssignableUser {
  id: number
  username: string
  role: UserRole
  name: string | null
}

export const getCachedAssignableUsers = unstable_cache(
  async (): Promise<AssignableUser[]> => {
    return db.user.findMany({
      where: { role: { in: ['DEV', 'ADMIN'] } },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ],
      select: { id: true, username: true, role: true, name: true }
    })
  },
  ['assignable-users-cache'],
  { tags: ['assignable-users'] }
)
