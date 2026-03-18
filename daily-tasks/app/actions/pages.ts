'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Prisma, TaskStatus } from '@prisma/client'
import {
    canCreateIncidencePage,
    canDeleteIncidencePage,
    canEditIncidencePage,
    canSetMainIncidencePage,
    getAuthenticatedUser,
    getIncidenceAccessContext,
    getPageAccessContext,
    isEditableIncidenceStatus,
} from '@/lib/authorization'

export type PageContent = Prisma.InputJsonValue

function ensureIncidenceIsEditable(status: TaskStatus) {
    if (!isEditableIncidenceStatus(status)) {
        return { success: false, error: 'No puede modificar páginas de una incidencia desestimada' } as const
    }

    return null
}

export async function createPage(incidenceId: number, title: string) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!incidenceId) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const accessContext = await getIncidenceAccessContext(incidenceId, user.id)
        if (!accessContext) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(accessContext.status ?? TaskStatus.DISMISSED)
        if (editabilityError) return editabilityError

        if (!canCreateIncidencePage(user, accessContext)) {
            return { success: false, error: 'No tiene permisos para crear páginas en esta incidencia' }
        }

        const page = await db.incidencePage.create({
            data: {
                title: title.trim().slice(0, 60),
                content: Prisma.JsonNull,
                incidenceId,
                authorId: user.id,
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: page }
    } catch (error) {
        console.error('Error creating page:', error)
        return { success: false, error: 'Error al crear la página' }
    }
}

export async function updatePageContent(
    pageId: number,
    content: PageContent,
    title?: string
) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!pageId) {
        return { success: false, error: 'ID de página requerido' }
    }

    try {
        const page = await db.incidencePage.findUnique({
            where: { id: pageId },
            select: { incidenceId: true }
        })

        if (!page) {
            return { success: false, error: 'Página no encontrada' }
        }

        const accessContext = await getPageAccessContext(pageId, user.id)
        if (!accessContext) {
            return { success: false, error: 'Página no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(accessContext.status ?? TaskStatus.DISMISSED)
        if (editabilityError) return editabilityError

        if (!canEditIncidencePage(user, accessContext)) {
            return { success: false, error: 'No tiene permisos para editar esta página' }
        }

        const updateData: Prisma.IncidencePageUpdateInput = {
            content: content as Prisma.InputJsonValue,
            ...(title !== undefined
                ? { title: title.trim().slice(0, 60) }
                : {})
        }

        await db.incidencePage.update({
            where: { id: pageId },
            data: updateData
        })

        revalidatePath(`/dashboard/incidences/${page.incidenceId}/pages/${pageId}`)
        revalidatePath(`/dashboard/shared-pages/${pageId}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating page:', error)
        return { success: false, error: 'Error al actualizar la página' }
    }
}

export async function deletePage(pageId: number) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!pageId) {
        return { success: false, error: 'ID de página requerido' }
    }

    try {
        const page = await db.incidencePage.findUnique({
            where: { id: pageId },
            include: { incidence: true }
        })

        if (!page) {
            return { success: false, error: 'Página no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(page.incidence.status)
        if (editabilityError) return editabilityError

        const accessContext = await getPageAccessContext(pageId, user.id)
        if (!accessContext || !canDeleteIncidencePage(user, accessContext)) {
            return { success: false, error: 'No tiene permisos para eliminar esta página' }
        }

        await db.incidencePage.delete({
            where: { id: pageId }
        })

        revalidatePath(`/dashboard`)
        return { success: true }
    } catch (error) {
        console.error('Error deleting page:', error)
        return { success: false, error: 'Error al eliminar la página' }
    }
}

export async function setMainIncidencePage(incidenceId: number, pageId: number) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!incidenceId || !pageId) {
        return { success: false, error: 'ID de incidencia y página requeridos' }
    }

    try {
        const accessContext = await getIncidenceAccessContext(incidenceId, user.id)
        if (!accessContext) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(accessContext.status ?? TaskStatus.DISMISSED)
        if (editabilityError) return editabilityError

        const page = await db.incidencePage.findFirst({
            where: { id: pageId, incidenceId }
        })

        if (!page) {
            return { success: false, error: 'Página no encontrada' }
        }

        const pageAccessContext = await getPageAccessContext(pageId, user.id)
        if (!pageAccessContext || !canSetMainIncidencePage(user, pageAccessContext)) {
            return { success: false, error: 'No tiene permisos para fijar esta página' }
        }

        await db.$transaction([
            db.incidencePage.updateMany({
                where: { incidenceId },
                data: { isMainPage: false }
            }),
            db.incidencePage.update({
                where: { id: pageId },
                data: { isMainPage: true }
            })
        ])

        revalidatePath(`/dashboard`)
        return { success: true }
    } catch (error) {
        console.error('Error setting main page:', error)
        return { success: false, error: 'Error al establecer la página principal' }
    }
}
