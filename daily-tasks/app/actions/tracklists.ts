'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'

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
    impact: boolean
    tramite?: string
    observations?: string
    assignedToId?: number
}

export async function getTracklists(locale: Locale = 'es') {
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

export async function getTicketsByTracklist(tracklistId: string, locale: Locale = 'es') {
    try {
        const tickets = await db.ticketQA.findMany({
            where: { tracklistId: Number(tracklistId) },
            orderBy: { ticketNumber: 'desc' },
            include: {
                reportedBy: { select: { id: true, name: true, username: true } },
                assignedTo: { select: { id: true, name: true, username: true } }
            }
        })
        return { success: true, data: tickets }
    } catch (error) {
        console.error('Error fetching tickets:', error)
        return { success: false, error: t(locale, 'errors.fetchError') }
    }
}

export async function createTicket(tracklistId: string, data: CreateTicketData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') }
    }

    try {
        const lastTicket = await db.ticketQA.findFirst({
            where: { tracklistId: Number(tracklistId) },
            orderBy: { ticketNumber: 'desc' }
        })
        const nextTicketNumber = (lastTicket?.ticketNumber ?? 0) + 1

        const ticket = await db.ticketQA.create({
            data: {
                tracklistId: Number(tracklistId),
                ticketNumber: nextTicketNumber,
                type: data.type,
                module: data.module,
                description: data.description,
                priority: data.priority,
                impact: data.impact,
                tramite: data.tramite,
                observations: data.observations,
                reportedById: Number(session.user.id),
                assignedToId: data.assignedToId
            }
        })
        revalidatePath('/tracklists')
        return { success: true, data: ticket }
    } catch (error) {
        console.error('Error creating ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}
