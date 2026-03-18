'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { TaskStatus, UserRole } from '@prisma/client'
import type { ScriptType } from '@prisma/client'

function ensureIncidenceIsEditable(status: TaskStatus) {
    if (status === TaskStatus.DISMISSED) {
        return { success: false, error: 'No puede modificar scripts de una incidencia desestimada' } as const
    }

    return null
}

export async function getScriptsByIncidence(incidenceId: number) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const scripts = await db.script.findMany({
            where: { incidenceId },
            orderBy: { updatedAt: 'desc' },
            include: {
                createdBy: {
                    select: { id: true, name: true, username: true }
                }
            }
        })

        return { success: true, data: scripts }
    } catch (error) {
        console.error('Error fetching scripts:', error)
        return { success: false, error: 'Error al obtener los scripts' }
    }
}

export async function createScript(data: {
    incidenceId: number
    content: string
    type: ScriptType
}) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!data.incidenceId || !data.content.trim()) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: data.incidenceId }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(incidence.status)
        if (editabilityError) return editabilityError

        const createdById = Number(session.user.id)

        const script = await db.script.create({
            data: {
                content: data.content,
                type: data.type,
                incidenceId: data.incidenceId,
                createdById,
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: script }
    } catch (error) {
        console.error('Error creating script:', error)
        return { success: false, error: 'Error al crear el script' }
    }
}

export async function updateScript(
    scriptId: number,
    data: { content: string; type: ScriptType }
) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!scriptId || !data.content.trim()) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const script = await db.script.findUnique({
            where: { id: scriptId },
            include: { incidence: { select: { status: true } } }
        })

        if (!script) {
            return { success: false, error: 'Script no encontrado' }
        }

        const editabilityError = ensureIncidenceIsEditable(script.incidence.status)
        if (editabilityError) return editabilityError

        const userId = Number(session.user.id)
        const userRole = session.user.role as UserRole

        if (userRole !== UserRole.ADMIN && script.createdById !== userId) {
            return { success: false, error: 'No tiene permisos para editar este script' }
        }

        const updated = await db.script.update({
            where: { id: scriptId },
            data: {
                content: data.content,
                type: data.type,
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: updated }
    } catch (error) {
        console.error('Error updating script:', error)
        return { success: false, error: 'Error al actualizar el script' }
    }
}

export async function deleteScript(scriptId: number) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!scriptId) {
        return { success: false, error: 'ID de script requerido' }
    }

    try {
        const script = await db.script.findUnique({
            where: { id: scriptId },
            include: { incidence: { select: { status: true } } }
        })

        if (!script) {
            return { success: false, error: 'Script no encontrado' }
        }

        const editabilityError = ensureIncidenceIsEditable(script.incidence.status)
        if (editabilityError) return editabilityError

        const userId = Number(session.user.id)
        const userRole = session.user.role as UserRole

        if (userRole !== UserRole.ADMIN && script.createdById !== userId) {
            return { success: false, error: 'No tiene permisos para eliminar este script' }
        }

        await db.script.delete({ where: { id: scriptId } })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting script:', error)
        return { success: false, error: 'Error al eliminar el script' }
    }
}
