'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { createTicketSchema } from '@/types'
import { TicketType, TicketQAStatus, Priority, TaskType } from '@/types/enums'
import { TaskStatus } from '@prisma/client'

interface CreateTracklistData {
    title: string
    description?: string
    dueDate?: Date
    externalWorkItemIds?: number[]
}

interface UpdateTracklistData {
    id: number
    title: string
    description?: string
    dueDate?: Date
    externalWorkItemIds?: number[]
}

interface CreateTicketData {
    type: TicketType
    module: string
    description: string
    priority: Priority
    externalWorkItemId?: number
    observations?: string
    assignedToId?: number
}

const TICKET_TYPE_TO_TASK_TYPE: Record<TicketType, TaskType> = {
    [TicketType.BUG]: TaskType.I_CASO,
    [TicketType.CAMBIO]: TaskType.I_MODAPL,
    [TicketType.CONSULTA]: TaskType.I_CONS,
}

const TICKET_TYPE_TITLE_PREFIX: Record<TicketType, string> = {
    [TicketType.BUG]: 'Corrección',
    [TicketType.CAMBIO]: 'Modificación',
    [TicketType.CONSULTA]: 'Consulta',
}

const TICKET_TYPE_SUBTASK_TITLE: Record<TicketType, string> = {
    [TicketType.BUG]: 'Corrección',
    [TicketType.CAMBIO]: 'Modificación',
    [TicketType.CONSULTA]: 'Análisis',
}


async function runAssignmentTransaction(
    ticketId: number,
    assignedToId: number,
    tracklistId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const ticket = await db.ticketQA.findUnique({ where: { id: ticketId } })
        if (!ticket) return { success: false, error: 'Ticket no encontrado' }

        const moduleRecord = await db.module.findUnique({ where: { slug: ticket.module.toLowerCase() } })
        if (!moduleRecord) return { success: false, error: 'Módulo no encontrado' }

        const incidencePriority = ticket.priority
        const titlePrefix = TICKET_TYPE_TITLE_PREFIX[ticket.type as TicketType]
        const subTaskTitle = TICKET_TYPE_SUBTASK_TITLE[ticket.type as TicketType]

        let workItem = ticket.externalWorkItemId
            ? await db.externalWorkItem.findUnique({ where: { id: ticket.externalWorkItemId } })
            : null

        if (!workItem) {
            // Fallback: create ExternalWorkItem from ticket type + id if none linked
            const taskType = TICKET_TYPE_TO_TASK_TYPE[ticket.type as TicketType]
            workItem = await db.externalWorkItem.upsert({
                where: { type_externalId: { type: taskType, externalId: ticket.id } },
                create: { type: taskType, externalId: ticket.id, title: `${titlePrefix} – Ticket ${ticket.id}` },
                update: {},
            })
        }

        const title = workItem.title || `${titlePrefix} – ${workItem.type} ${workItem.externalId}`

        await db.$transaction(async (tx) => {
            const existingIncidence = await tx.incidence.findFirst({
                where: { externalWorkItemId: workItem!.id },
            })

            const newIncidence = existingIncidence ?? await tx.incidence.create({
                data: {
                    externalWorkItemId: workItem!.id,
                    title,
                    technologyId: moduleRecord.technologyId,
                    priority: incidencePriority,
                    status: TaskStatus.TODO,
                },
            })

            const assignment = await tx.assignment.upsert({
                where: { incidenceId_userId: { incidenceId: newIncidence.id, userId: assignedToId } },
                create: { incidenceId: newIncidence.id, userId: assignedToId, isAssigned: true },
                update: { isAssigned: true },
            })

            await tx.subTask.create({
                data: { title: subTaskTitle, assignmentId: assignment.id },
            })

            await tx.ticketQA.update({
                where: { id: ticketId },
                data: {
                    status: TicketQAStatus.ASSIGNED,
                    assignedToId,
                    incidenceId: newIncidence.id,
                    hasUnreadUpdates: false,
                },
            })
        })

        revalidatePath(`/tracklists/${tracklistId}`)
        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error in assignment transaction:', error)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: 'Ya existe una incidencia con ese trámite y tipo' }
        }
        return { success: false, error: 'Error al ejecutar la asignación' }
    }
}

export async function assignTicket(
    ticketId: number,
    assignedToId: number,
    tracklistId: number
): Promise<{ success: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    try {
        const ticket = await db.ticketQA.findUnique({
            where: { id: ticketId, tracklistId },
        })
        if (!ticket) return { success: false, error: 'Ticket no encontrado' }
        if (ticket.status !== TicketQAStatus.NEW) {
            return { success: false, error: 'Solo se pueden asignar tickets en estado Nuevo' }
        }
        return runAssignmentTransaction(ticketId, assignedToId, tracklistId)
    } catch (error) {
        console.error('Error assigning ticket:', error)
        if (error instanceof Error && 'code' in error && error.code === 'P2002') {
            return { success: false, error: 'Ya existe una incidencia con ese trámite y tipo' }
        }
        return { success: false, error: 'Error al asignar ticket' }
    }
}

export async function clearTicketUnreadUpdates(
    ticketId: number,
    tracklistId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        await db.ticketQA.update({
            where: { id: ticketId },
            data: { hasUnreadUpdates: false },
        })
        revalidatePath(`/tracklists/${tracklistId}`)
        return { success: true }
    } catch (error) {
        console.error('Error clearing unread updates:', error)
        return { success: false, error: 'Error al limpiar notificaciones' }
    }
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
            externalWorkItems?: { connect: { id: number }[] }
        } = {
            title: data.title,
            description: data.description,
            dueDate: data.dueDate,
            createdById: Number(session.user.id)
        }

        if (data.externalWorkItemIds && data.externalWorkItemIds.length > 0) {
            tracklistData.externalWorkItems = {
                connect: data.externalWorkItemIds.map(id => ({ id }))
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
        const currentTracklist = await db.tracklist.findUnique({
            where: { id: data.id },
            select: { externalWorkItems: { select: { id: true } } }
        })
        const currentWorkItemIds = currentTracklist?.externalWorkItems.map(i => i.id) ?? []
        const newWorkItemIds = data.externalWorkItemIds || []

        const toDisconnect = currentWorkItemIds.filter(id => !newWorkItemIds.includes(id))
        const toConnect = newWorkItemIds.filter(id => !currentWorkItemIds.includes(id))

        const tracklist = await db.tracklist.update({
            where: { id: data.id },
            data: {
                title: data.title,
                description: data.description,
                dueDate: data.dueDate,
                externalWorkItems: {
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
                assignedTo: { select: { id: true, name: true, username: true } },
                externalWorkItem: { select: { id: true, type: true, externalId: true } },
                dismissedBy: { select: { id: true, name: true, username: true } }
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
                externalWorkItemId: data.externalWorkItemId,
                observations: data.observations,
                reportedById: sessionUserId,
            }
        })

        if (data.assignedToId) {
            const txResult = await runAssignmentTransaction(ticket.id, data.assignedToId, tracklistId)
            if (!txResult.success) {
                console.error('Assignment transaction failed after ticket creation:', txResult.error)
            }
        }

        revalidatePath('/tracklists')
        return { success: true, data: ticket }
    } catch (error) {
        console.error('Error creating ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

export async function getTracklistExternalWorkItems(tracklistId: number) {
    try {
        const tracklist = await db.tracklist.findUnique({
            where: { id: tracklistId },
            select: {
                externalWorkItems: {
                    select: { id: true, type: true, externalId: true }
                }
            }
        })
        return { success: true, data: tracklist?.externalWorkItems ?? [] }
    } catch (error) {
        console.error('Error fetching tracklist external work items:', error)
        return { success: false, error: 'Error al obtener trámites' }
    }
}

export async function dismissTicket(ticketId: number, reason: string, tracklistId: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') }
    }

    if (reason.trim().length < 3) {
        return { success: false, error: 'La razón debe tener al menos 3 caracteres' }
    }

    try {
        await db.ticketQA.update({
            where: { id: ticketId },
            data: { status: TicketQAStatus.DISMISSED, dismissReason: reason.trim(), dismissedById: Number(session.user.id) }
        })
        revalidatePath(`/tracklists/${tracklistId}`)
        return { success: true }
    } catch (error) {
        console.error('Error dismissing ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

export async function getTicketFormData(tracklistId: number) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const [techsResult, workItemsResult] = await Promise.all([
            getCachedTechsWithModules(),
            getTracklistExternalWorkItems(tracklistId)
        ])

        return {
            success: true,
            data: {
                techs: techsResult.techs,
                allModules: techsResult.allModules,
                defaultTech: techsResult.defaultTech,
                defaultModules: techsResult.defaultModules,
                externalWorkItems: workItemsResult.success ? workItemsResult.data : []
            }
        }
    } catch (error) {
        console.error('Error fetching ticket form data:', error)
        return { success: false, error: 'Error al obtener datos del formulario' }
    }
}
