'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createWorkspace(name: string, userId: string) {
  try {
    // Regla 1: Longitud mínima
    if (name.trim().length < 3) {
      throw new Error("El nombre debe tener al menos 3 caracteres.");
    }

    // Regla 2: No empezar con número
    if (/^\d/.test(name)) {
      throw new Error("El nombre no puede comenzar con un número.");
    }

    // Regla 3: Unicidad (Por Dueño)
    const existing = await db.workspace.findFirst({
      where: {
        ownerId: userId,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });
    if (existing) {
      throw new Error("Ya tienes un Workspace con este nombre.");
    }

    // Verificar que el usuario exista antes de crear el workspace
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error(`User with ID ${userId} not found`)
    }

    const workspace = await db.workspace.create({
      data: {
        name: name.trim(),
        ownerId: userId,
        members: {
          create: [{ userId }]
        }
      },
    })

    revalidatePath('/dashboard')
    return workspace
  } catch (error) {
    console.error('Error creating workspace:', error)

    // Si el error ya es una instancia de Error (ej: nuestras validaciones), relánzalo tal cual
    if (error instanceof Error) {
      throw error;
    }

    // Si es un error de clave foránea, proporcionar un mensaje más descriptivo
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2003') {
      throw new Error('Failed to create workspace: User not found')
    }

    // Solo si es un error desconocido (ej: fallo de DB raro), lanza el genérico
    throw new Error('Failed to create workspace')
  }
}

export async function getUserWorkspaces(userId: string) {
  try {
    const workspaces = await db.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    })

    return workspaces
  } catch (error) {
    console.error('Error fetching user workspaces:', error)
    throw new Error('Failed to fetch workspaces')
  }
}
