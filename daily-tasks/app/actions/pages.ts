'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { Prisma, TaskStatus } from '@prisma/client'

export type PageContent = Prisma.InputJsonValue

function ensureIncidenceIsEditable(status: TaskStatus) {
    if (status === TaskStatus.DISMISSED) {
        return { success: false, error: 'No puede modificar páginas de una incidencia desestimada' } as const
    }

    return null
}

export async function createPage(incidenceId: number, title: string) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!incidenceId) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(incidence.status)
        if (editabilityError) return editabilityError

        const authorId = Number(session.user.id)

        const page = await db.incidencePage.create({
            data: {
                title: title.trim().slice(0, 60),
                content: Prisma.JsonNull,
                incidenceId,
                authorId,
            }
        })

        revalidatePath('/incidences')
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
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!pageId) {
        return { success: false, error: 'ID de página requerido' }
    }

    try {
        const page = await db.incidencePage.findUnique({
            where: { id: pageId }
        })

        if (!page) {
            return { success: false, error: 'Página no encontrada' }
        }

        const incidence = await db.incidence.findUnique({
            where: { id: page.incidenceId },
            select: { status: true }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(incidence.status)
        if (editabilityError) return editabilityError

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

        revalidatePath(`/incidences/${page.incidenceId}/pages/${pageId}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating page:', error)
        return { success: false, error: 'Error al actualizar la página' }
    }
}

export async function deletePage(pageId: number) {
    const session = await auth()
    if (!session?.user) {
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

        await db.incidencePage.delete({
            where: { id: pageId }
        })

        revalidatePath('/incidences')
        return { success: true }
    } catch (error) {
        console.error('Error deleting page:', error)
        return { success: false, error: 'Error al eliminar la página' }
    }
}

export async function setMainIncidencePage(incidenceId: number, pageId: number) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!incidenceId || !pageId) {
        return { success: false, error: 'ID de incidencia y página requeridos' }
    }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const editabilityError = ensureIncidenceIsEditable(incidence.status)
        if (editabilityError) return editabilityError

        const page = await db.incidencePage.findFirst({
            where: { id: pageId, incidenceId }
        })

        if (!page) {
            return { success: false, error: 'Página no encontrada' }
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

        revalidatePath('/incidences')
        return { success: true }
    } catch (error) {
        console.error('Error setting main page:', error)
        return { success: false, error: 'Error al establecer la página principal' }
    }
}
