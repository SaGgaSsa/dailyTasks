'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { Prisma } from '@prisma/client'

export type PageContent = Prisma.InputJsonValue

export async function createPage(incidenceId: number, title: string) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!incidenceId || !title) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const authorId = Number(session.user.id)

        const page = await db.incidencePage.create({
            data: {
                title: title.trim(),
                content: Prisma.JsonNull,
                incidenceId,
                authorId
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

        const updateData: Prisma.IncidencePageUpdateInput = {
            content: content as Prisma.InputJsonValue,
            ...(title !== undefined && { title: title.trim() })
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
