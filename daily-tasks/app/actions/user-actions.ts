'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { User } from '@prisma/client'
import { UserRole } from '@/types/enums'

export async function getUsers() {
  return await db.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
}

// Omit generated fields and relations
type UpsertUserData = Partial<User> & {
  password?: string // password is optional on edit
}

export async function upsertUser(data: UpsertUserData) {
  try {
    const { id, name, email, username, password, role } = data

    if (!username) {
      throw new Error('Username is required')
    }

    // Username validation
    if (!/^[a-zA-Z]{3}$/.test(username)) {
      throw new Error('El usuario debe tener exactamente 3 letras (ej: SAG).')
    }

    const upperUsername = username.toUpperCase()

    if (id) {
      // Update
      const updateData: Record<string, unknown> = {
        name,
        email,
        username: upperUsername,
        role: role as UserRole,
      }
      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10)
      }
      await db.user.update({
        where: { id },
        data: updateData,
      })
    } else {
      // Create
      if (!name || !email) {
        throw new Error('Missing required fields')
      }
      if (!password) {
        throw new Error('Password is required for new users')
      }
      const hashedPassword = await bcrypt.hash(password, 10)
      const newUser = await db.user.create({
        data: {
          name,
          email,
          username: upperUsername,
          password: hashedPassword,
          role: role as UserRole || 'DEV',
        },
      })
    }
    revalidatePath('/dashboard/users')
    return { success: true }
  } catch (error) {
    console.error('Error upserting user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save user' }
  }
}

export async function deleteUser(id: string) {
  try {
    await db.user.delete({
      where: { id },
    })
    revalidatePath('/dashboard/users')
    return { success: true }
  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' }
  }
}

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const username = formData.get('username') as string

  // Adapt to UpsertUserData
    const result = await upsertUser({
    name,
    email,
    password,
    role: role as UserRole | undefined,
    username
  })

  if (result.success) {
    return { success: 'Usuario creado correctamente', error: null }
  } else {
    return { success: null, error: result.error || 'Error al crear usuario' }
  }
}

export async function updateUserPassword(formData: FormData) {
  // TODO: Implement password update
  return { success: false, error: 'Not implemented' }
}
