'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { TaskStatus } from '@prisma/client'
import type { ScriptType } from '@prisma/client'
import {
    canCreateScript,
    canDeleteScript,
    canEditScript,
    getAuthenticatedUser,
    getIncidenceAccessContext,
    getScriptAccessContext,
    isEditableIncidenceStatus,
} from '@/lib/authorization'

function ensureIncidenceIsEditable(status: TaskStatus) {
    if (!isEditableIncidenceStatus(status)) {
        return { success: false, error: 'No puede modificar scripts de una incidencia desestimada' } as const
    }

    return null
}

export async function getScriptsByIncidence(incidenceId: number) {
    const user = await getAuthenticatedUser()
    if (!user) {
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
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!data.incidenceId || !data.content.trim()) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const accessContext = await getIncidenceAccessContext(data.incidenceId, user.id)
        if (!accessContext) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(accessContext.status ?? TaskStatus.DISMISSED)
        if (editabilityError) return editabilityError

        if (!canCreateScript(user, accessContext)) {
            return { success: false, error: 'No tiene permisos para crear scripts en esta incidencia' }
        }

        const script = await db.script.create({
            data: {
                content: data.content,
                type: data.type,
                incidenceId: data.incidenceId,
                createdById: user.id,
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
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!scriptId || !data.content.trim()) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const accessContext = await getScriptAccessContext(scriptId, user.id)
        if (!accessContext) {
            return { success: false, error: 'Script no encontrado' }
        }

        const editabilityError = ensureIncidenceIsEditable(accessContext.status ?? TaskStatus.DISMISSED)
        if (editabilityError) return editabilityError

        if (!canEditScript(user, accessContext)) {
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
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!scriptId) {
        return { success: false, error: 'ID de script requerido' }
    }

    try {
        const accessContext = await getScriptAccessContext(scriptId, user.id)
        if (!accessContext) {
            return { success: false, error: 'Script no encontrado' }
        }

        const editabilityError = ensureIncidenceIsEditable(accessContext.status ?? TaskStatus.DISMISSED)
        if (editabilityError) return editabilityError

        if (!canDeleteScript(user, accessContext)) {
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
