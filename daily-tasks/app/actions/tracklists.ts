'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { createTicketSchema } from '@/types'

interface CreateTracklistData {
    title: string
    description?: string
    dueDate?: Date
    incidenceIds?: number[]
}

interface UpdateTracklistData {
    id: number
    title: string
    description?: string
    dueDate?: Date
    incidenceIds?: number[]
}

interface CreateTicketData {
    type: string
    module: string
    description: string
    priority: string
    tramite?: string
    observations?: string
    assignedToId?: number
    incidenceId?: number
}

export async function getTracklists(locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') }
    }

    try {
        const tracklists = await db.tracklist.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { tickets: true } },
                createdBy: { select: { id: true, name: true, username: true } }
            }
        })
        return { success: true, data: tracklists }
    } catch (error) {
        console.error('Error fetching tracklists:', error)
        return { success: false, error: t(locale, 'errors.fetchError') }
    }
}

export async function createTracklist(data: CreateTracklistData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') }
    }

    try {
        const tracklistData: {
            title: string
            description?: string
            dueDate?: Date
            createdById: number
            incidences?: { connect: { id: number }[] }
        } = {
            title: data.title,
            description: data.description,
            dueDate: data.dueDate,
            createdById: Number(session.user.id)
        }

        if (data.incidenceIds && data.incidenceIds.length > 0) {
            tracklistData.incidences = {
                connect: data.incidenceIds.map(id => ({ id }))
            }
        }

        const tracklist = await db.tracklist.create({
            data: tracklistData
        })
        revalidatePath('/tracklists')
        return { success: true, data: tracklist }
    } catch (error) {
        console.error('Error creating tracklist:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

export async function updateTracklist(data: UpdateTracklistData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') }
    }

    try {
        const currentIncidences = await db.incidence.findMany({
            where: { tracklistId: data.id }
        })
        const currentIncidenceIds = currentIncidences.map(i => i.id)
        const newIncidenceIds = data.incidenceIds || []
        
        const toDisconnect = currentIncidenceIds.filter(id => !newIncidenceIds.includes(id))
        const toConnect = newIncidenceIds.filter(id => !currentIncidenceIds.includes(id))

        const tracklist = await db.tracklist.update({
            where: { id: data.id },
            data: {
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
                incidences: {
                    disconnect: toDisconnect.map(id => ({ id })),
                    connect: toConnect.map(id => ({ id }))
                }
            }
        })
        revalidatePath('/tracklists')
        revalidatePath(`/tracklists/${data.id}`)
        return { success: true, data: tracklist }
    } catch (error) {
        console.error('Error updating tracklist:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

export async function getTicketsByTracklist(tracklistId: number, locale: Locale = 'es') {
    try {
        const tickets = await db.ticketQA.findMany({
            where: { tracklistId: tracklistId },
            include: {
                reportedBy: { select: { id: true, name: true, username: true } },
                assignedTo: { select: { id: true, name: true, username: true } }
            }
        })
        const sorted = sortTicketsByPriorityAndNumber(tickets)
        return { success: true, data: sorted }
    } catch (error) {
        console.error('Error fetching tickets:', error)
        return { success: false, error: t(locale, 'errors.fetchError') }
    }
}

export async function createTicket(tracklistId: number, data: CreateTicketData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') }
    }

    const parsed = createTicketSchema.safeParse(data)
    if (!parsed.success) {
        const errors = parsed.error.issues.map(i => i.message).join(', ')
        return { success: false, error: errors }
    }

    try {
        const moduleExists = await db.module.findUnique({ where: { slug: data.module.toLowerCase() } })
        if (!moduleExists) {
            return { success: false, error: 'Módulo no encontrado' }
        }

        const sessionUserId = Number(session.user.id)
        const sessionUser = await db.user.findUnique({
            where: { id: sessionUserId }
        })

        if (!sessionUser) {
            return { success: false, error: 'Usuario de la sesión no encontrado. Inicia sesión de nuevo.' }
        }

        if (data.incidenceId) {
            const incidenceInTracklist = await db.incidence.findFirst({
                where: { id: data.incidenceId, tracklistId }
            })
            if (!incidenceInTracklist) {
                return { success: false, error: 'La incidencia no pertenece a este tracklist' }
            }
        }

        const lastTicket = await db.ticketQA.findFirst({
            where: { tracklistId: tracklistId },
            orderBy: { ticketNumber: 'desc' }
        })
        const nextTicketNumber = (lastTicket?.ticketNumber ?? 0) + 1

        const ticket = await db.ticketQA.create({
            data: {
                tracklistId: tracklistId,
                ticketNumber: nextTicketNumber,
                type: data.type,
                module: data.module,
                description: data.description,
                priority: data.priority,
                tramite: data.tramite,
                observations: data.observations,
                reportedById: sessionUserId,
                assignedToId: data.assignedToId,
                incidenceId: data.incidenceId
            }
        })
        revalidatePath('/tracklists')
        return { success: true, data: ticket }
    } catch (error) {
        console.error('Error creating ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

export async function getTracklistIncidences(tracklistId: number) {
    try {
        const tracklist = await db.tracklist.findUnique({
            where: { id: tracklistId },
            select: {
                incidences: {
                    select: {
                        id: true,
                        type: true,
                        externalId: true
                    }
                }
            }
        })
        return { success: true, data: tracklist?.incidences ?? [] }
    } catch (error) {
        console.error('Error fetching tracklist incidences:', error)
        return { success: false, error: 'Error al obtener incidencias' }
    }
}

export async function getTicketFormData(tracklistId: number) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const [techsResult, incidencesResult] = await Promise.all([
            getCachedTechsWithModules(),
            getTracklistIncidences(tracklistId)
        ])
        
        return {
            success: true,
            data: {
                techs: techsResult.techs,
                allModules: techsResult.allModules,
                defaultTech: techsResult.defaultTech,
                defaultModules: techsResult.defaultModules,
                incidences: incidencesResult.success ? incidencesResult.data : []
            }
        }
    } catch (error) {
        console.error('Error fetching ticket form data:', error)
        return { success: false, error: 'Error al obtener datos del formulario' }
    }
}
