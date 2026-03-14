'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { IncidencePageType, Prisma, TaskStatus } from '@prisma/client'
import { SCRIPT_PAGE_TITLE } from '@/lib/incidence-pages'

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
                pageType: IncidencePageType.DEFAULT,
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
            ...(title !== undefined && page.pageType === IncidencePageType.DEFAULT
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

        if (page.pageType !== IncidencePageType.DEFAULT) {
            return { success: false, error: 'No se puede eliminar una página especial' }
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

        revalidatePath(`/dashboard`)
        return { success: true }
    } catch (error) {
        console.error('Error setting main page:', error)
        return { success: false, error: 'Error al establecer la página principal' }
    }
}

export async function getOrCreateScriptsPage(incidenceId: number) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!incidenceId) {
        return { success: false, error: 'ID de incidencia requerido' }
    }

    try {
        const authorId = Number(session.user.id)

        const page = await db.$transaction(async (tx) => {
            const incidence = await tx.incidence.findUnique({
                where: { id: incidenceId },
                select: { id: true, status: true }
            })

            if (!incidence) return null
            if (incidence.status === TaskStatus.DISMISSED) {
                throw new Error('INCIDENCE_DISMISSED')
            }

            const existing = await tx.incidencePage.findFirst({
                where: { incidenceId, pageType: IncidencePageType.SYSTEM_SCRIPTS }
            })

            if (existing) return existing

            return tx.incidencePage.create({
                data: {
                    title: SCRIPT_PAGE_TITLE,
                    content: Prisma.JsonNull,
                    incidenceId,
                    authorId,
                    pageType: IncidencePageType.SYSTEM_SCRIPTS,
                }
            })
        })

        if (!page) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        revalidatePath('/dashboard')
        return { success: true, data: page }
    } catch (error) {
        console.error('Error getting scripts page:', error)
        if (error instanceof Error && error.message === 'INCIDENCE_DISMISSED') {
            return { success: false, error: 'No puede modificar páginas de una incidencia desestimada' }
        }
        return { success: false, error: 'Error al obtener la página de scripts' }
    }
}
