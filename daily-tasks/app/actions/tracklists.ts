'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'

interface CreateTracklistData {
    title: string
    description?: string
    dueDate?: Date
}

interface CreateTicketData {
    type: string
    module: string
    description: string
    priority: string
    impact: string
    tramite?: string
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
        const tracklist = await db.tracklist.create({
            data: {
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
                createdById: Number(session.user.id)
            }
        })
        revalidatePath('/dashboard/tracklists')
        return { success: true, data: tracklist }
    } catch (error) {
        console.error('Error creating tracklist:', error)
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
                reportedById: Number(session.user.id),
                assignedToId: data.assignedToId
            }
        })
        revalidatePath('/dashboard/tracklists')
        return { success: true, data: ticket }
    } catch (error) {
        console.error('Error creating ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}
