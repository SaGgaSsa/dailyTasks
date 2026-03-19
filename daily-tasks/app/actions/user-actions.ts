'use server'

import { unstable_cache } from 'next/cache'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { createUserSchema, updateUserSchema } from '@/types'
import bcrypt from 'bcryptjs'
import { serializeExternalWorkItem } from '@/lib/work-item-types'
import { canManageUsers, getAuthenticatedUser } from '@/lib/authorization'

interface GetUsersResult {
    data: AdminUserSummary[]
    error?: string
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

export async function getUsers(): Promise<GetUsersResult> {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return { data: [], error: 'No autorizado' }
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
        return { data: users }
    } catch (error) {
        console.error('Error getting users:', error)
        return { data: [], error: 'Error al obtener los usuarios' }
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
        return { success: false, error: 'No autorizado' }
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
        return { success: null, error: 'No autorizado' }
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
        return { success: null, error: errors }
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
        return { success: 'Usuario creado correctamente', error: null }
    } catch (error) {
        console.error('Error creating user:', error)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return { success: null, error: 'El usuario ya existe' }
        }
        return { success: null, error: 'Error al crear el usuario' }
    }
}

export async function getUserByUsername(username: string) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return null
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { username }
        })
        return existingUser
    } catch (error) {
        console.error('Error getting user by username:', error)
        return null
    }
}

export async function getUserById(id: number) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return null
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { id }
        })
        return existingUser
    } catch (error) {
        console.error('Error getting user by id:', error)
        return null
    }
}

export async function getUserWithTechnologies(id: number) {
    const user = await getAuthenticatedUser()
    if (!user || !canManageUsers(user.role)) {
        return null
    }

    try {
        const existingUser = await db.user.findUnique({
            where: { id },
            include: {
                technologies: true
            }
        })
        return existingUser
    } catch (error) {
        console.error('Error getting user with technologies:', error)
        return null
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
    return null
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        assignments: {
          include: {
            incidence: { include: { externalWorkItem: { include: { workItemType: true } } } },
          },
          orderBy: { incidence: { updatedAt: 'desc' } },
          take: 5,
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
    })

    if (!user) {
      return null
    }

    const assignedIncidences = user.assignments.map((a) => ({
      ...a.incidence,
      externalWorkItem: a.incidence.externalWorkItem ? serializeExternalWorkItem(a.incidence.externalWorkItem) : null,
    }))
    const totalTasks = user._count.assignments
    const pendingTasks = assignedIncidences.filter(
      (i) => i.status !== 'DONE' && i.status !== 'DISMISSED'
    ).length
    const completedTasks = assignedIncidences.filter(
      (i) => i.status === 'DONE'
    ).length

    return {
      ...user,
      metrics: {
        totalTasks,
        pendingTasks,
        completedTasks,
      },
      recentIncidences: assignedIncidences,
    }
  } catch (error) {
    console.error('Error getting user details:', error)
    return null
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
