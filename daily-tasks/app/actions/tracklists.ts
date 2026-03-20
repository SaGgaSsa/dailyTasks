'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { createTicketSchema } from '@/types'
import { TicketType, TicketQAStatus, Priority, TracklistStatus, NotificationType } from '@/types/enums'
import { createNotificationsForUsers } from '@/app/actions/notifications'
import { TaskStatus, Priority as PrismaPriority, Prisma, ExternalWorkItemStatus } from '.prisma/client'
import { completeIncidenceCore } from '@/app/actions/incidence-actions'
import { externalWorkItemBaseSelect, serializeExternalWorkItem } from '@/lib/work-item-types'

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
    moduleId: number
    description: string
    priority: Priority
    externalWorkItemId?: number
    observations?: string
    assignedToId?: number
}

const ticketDetailsInclude = {
    reportedBy: { select: { id: true, name: true, username: true } },
    assignedTo: { select: { id: true, name: true, username: true } },
    externalWorkItem: { select: externalWorkItemBaseSelect },
    dismissedBy: { select: { id: true, name: true, username: true } },
    module: { select: { id: true, name: true, slug: true, technology: { select: { name: true } } } },
    incidence: {
        select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            estimatedTime: true,
            assignments: {
                where: { isAssigned: true },
                select: { assignedHours: true }
            },
            _count: {
                select: { scripts: true },
            },
        },
    },
} satisfies Prisma.TicketQAInclude

type TicketWithScripts = Prisma.TicketQAGetPayload<{ include: typeof ticketDetailsInclude }>

function enrichTicketScripts<T extends TicketWithScripts>(ticket: T) {
    const inc = ticket.incidence

    const incidenceGantt = inc ? {
        id: inc.id,
        status: inc.status as import('@/types/enums').TaskStatus,
        startedAt: inc.startedAt,
        completedAt: inc.completedAt,
        estimatedTime: inc.estimatedTime,
        totalAssignedHours: inc.assignments.reduce((sum, a) => sum + (a.assignedHours ?? 0), 0),
    } : null

    return {
        ...ticket,
        externalWorkItem: ticket.externalWorkItem ? serializeExternalWorkItem(ticket.externalWorkItem) : null,
        hasScripts: (inc?._count?.scripts ?? 0) > 0,
        incidenceGantt,
    }
}

const PRIORITY_MAP: Record<string, PrismaPriority> = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    BLOCKER: 'BLOCKER',
}

const TICKET_TYPE_TITLE_PREFIX: Record<TicketType, string> = {
    [TicketType.BUG]: 'Corrección',
    [TicketType.CAMBIO]: 'Modificación',
    [TicketType.CONSULTA]: 'Consulta',
}

const TICKET_TYPE_TASK_TITLE: Record<TicketType, string> = {
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
        const ticket = await db.ticketQA.findUnique({
            where: { id: ticketId },
            include: { module: { select: { id: true, name: true, slug: true, technologyId: true } } },
        })
        if (!ticket) return { success: false, error: 'Ticket no encontrado' }

        const incidencePriority = PRIORITY_MAP[ticket.priority] ?? 'MEDIUM'
        const titlePrefix = TICKET_TYPE_TITLE_PREFIX[ticket.type as TicketType]
        const taskTitle = TICKET_TYPE_TASK_TITLE[ticket.type as TicketType]

        const workItem = ticket.externalWorkItemId
            ? await db.externalWorkItem.findUnique({
                where: { id: ticket.externalWorkItemId },
                select: externalWorkItemBaseSelect,
            })
            : null

        if (!workItem) {
            return { success: false, error: 'El ticket no tiene un trámite externo válido. Debe vincularse un ExternalWorkItem existente.' }
        }

        const serializedWorkItem = workItem ? serializeExternalWorkItem(workItem) : null
        const title = serializedWorkItem?.title || `${titlePrefix} – ${serializedWorkItem?.type ?? ''} ${serializedWorkItem?.externalId ?? ''}`

        await db.$transaction(async (tx) => {
            const newIncidence = await tx.incidence.create({
                data: {
                    externalWorkItemId: workItem!.id,
                    description: ticket.description || title,
                    technologyId: ticket.module.technologyId,
                    priority: incidencePriority,
                    status: TaskStatus.BACKLOG,
                },
            })

            const assignment = await tx.assignment.upsert({
                where: { incidenceId_userId: { incidenceId: newIncidence.id, userId: assignedToId } },
                create: { incidenceId: newIncidence.id, userId: assignedToId, isAssigned: true },
                update: { isAssigned: true },
            })

            await tx.task.create({
                data: { title: taskTitle, assignmentId: assignment.id },
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
        revalidatePath('/incidences')
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
            where: { status: TracklistStatus.ACTIVE },
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

        if (toDisconnect.length > 0) {
            const ticketedItems = await db.ticketQA.findMany({
                where: { tracklistId: data.id, externalWorkItemId: { in: toDisconnect } },
                select: { externalWorkItemId: true },
                distinct: ['externalWorkItemId']
            })
            if (ticketedItems.length > 0) {
                return { success: false, error: 'No se pueden eliminar trámites que tienen tickets creados' }
            }
        }

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

export async function getTracklistForEdit(tracklistId: number) {
    try {
        const tracklist = await db.tracklist.findUnique({
            where: { id: tracklistId },
            select: {
                id: true, title: true, description: true, dueDate: true,
                externalWorkItems: { select: externalWorkItemBaseSelect }
            }
        })
        if (!tracklist) return { success: false, error: 'Tracklist no encontrado' }

        const ticketedItems = await db.ticketQA.findMany({
            where: { tracklistId, externalWorkItemId: { not: null } },
            select: { externalWorkItemId: true },
            distinct: ['externalWorkItemId']
        })
        const lockedWorkItemIds = ticketedItems.map(t => t.externalWorkItemId!)

        return {
            success: true,
            data: {
                ...tracklist,
                externalWorkItems: tracklist.externalWorkItems.map(w => ({ ...serializeExternalWorkItem(w), title: null as string | null })),
                lockedWorkItemIds
            }
        }
    } catch (error) {
        console.error('Error fetching tracklist for edit:', error)
        return { success: false, error: 'Error al obtener el tracklist' }
    }
}

export async function getTicketsByTracklist(tracklistId: number, locale: Locale = 'es') {
    try {
        const tickets = await db.ticketQA.findMany({
            where: { tracklistId: tracklistId },
            include: ticketDetailsInclude,
        })
        const sorted = sortTicketsByPriorityAndNumber(tickets.map(enrichTicketScripts))
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
                moduleId: data.moduleId,
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

        // Reactivate tracklist if it was completed or archived
        const tracklist = await db.tracklist.findUnique({ where: { id: tracklistId }, select: { status: true, title: true } })
        if (tracklist && tracklist.status !== TracklistStatus.ACTIVE) {
            await db.tracklist.update({
                where: { id: tracklistId },
                data: { status: TracklistStatus.ACTIVE, completedAt: null, completedById: null },
            })
        }

        if (data.priority === Priority.BLOCKER) {
            const admins = await db.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
            const recipientIds = new Set<number>(admins.map(a => a.id))
            if (data.assignedToId) recipientIds.add(data.assignedToId)
            recipientIds.delete(sessionUserId)
            if (recipientIds.size > 0) {
                const tracklistTitle = tracklist?.title ?? `#${tracklistId}`
                await createNotificationsForUsers(
                    Array.from(recipientIds),
                    NotificationType.TICKET_BLOCKER_CREATED,
                    ticket.id,
                    'TICKET_QA',
                    `Nuevo ticket bloqueante #${ticket.ticketNumber} creado en ${tracklistTitle}`,
                )
            }
        }

        revalidatePath('/tracklists')
        revalidatePath(`/tracklists/${tracklistId}`)
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
                description: true,
                dueDate: true,
                externalWorkItems: {
                    where: { status: ExternalWorkItemStatus.ACTIVE },
                    select: externalWorkItemBaseSelect
                }
            }
        })
        return {
            success: true,
            data: tracklist?.externalWorkItems.map(serializeExternalWorkItem) ?? [],
            tracklistDetails: tracklist ? { description: tracklist.description, dueDate: tracklist.dueDate } : null
        }
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
        await db.$transaction(async (tx) => {
            const ticket = await tx.ticketQA.findUnique({
                where: { id: ticketId },
                select: { id: true, incidenceId: true }
            })

            if (!ticket) {
                throw new Error('TICKET_NOT_FOUND')
            }

            await tx.ticketQA.update({
                where: { id: ticketId },
                data: {
                    status: TicketQAStatus.DISMISSED,
                    dismissReason: reason.trim(),
                    dismissedById: Number(session.user.id)
                }
            })

            if (ticket.incidenceId) {
                await tx.incidence.update({
                    where: { id: ticket.incidenceId },
                    data: {
                        status: TaskStatus.DISMISSED,
                        completedAt: null
                    }
                })
            }
        })
        revalidatePath(`/tracklists/${tracklistId}`)
        revalidatePath('/incidences')
        return { success: true }
    } catch (error) {
        console.error('Error dismissing ticket:', error)
        if (error instanceof Error && error.message === 'TICKET_NOT_FOUND') {
            return { success: false, error: 'Ticket no encontrado' }
        }
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

export async function deleteTracklist(id: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) return { success: false, error: t(locale, 'auth.unauthorized') }
    try {
        await db.tracklist.delete({ where: { id } })
        revalidatePath('/tracklists')
        return { success: true }
    } catch (error) {
        console.error('Error deleting tracklist:', error)
        return { success: false, error: 'Error al eliminar el tracklist' }
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

export async function updateTicket(ticketId: number, tracklistId: number, data: CreateTicketData, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) return { success: false, error: t(locale, 'auth.unauthorized') }

    const parsed = createTicketSchema.safeParse(data)
    if (!parsed.success) {
        const errors = parsed.error.issues.map(i => i.message).join(', ')
        return { success: false, error: errors }
    }

    try {
        const ticket = await db.ticketQA.findUnique({ where: { id: ticketId, tracklistId } })
        if (!ticket) return { success: false, error: 'Ticket no encontrado' }
        if (ticket.status !== TicketQAStatus.NEW) {
            return { success: false, error: 'Solo se pueden editar tickets en estado Nuevo' }
        }

        await db.ticketQA.update({
            where: { id: ticketId },
            data: {
                type: data.type,
                moduleId: data.moduleId,
                description: data.description,
                priority: data.priority,
                externalWorkItemId: data.externalWorkItemId ?? null,
                observations: data.observations ?? null,
                assignedToId: data.assignedToId ?? null,
            }
        })

        if (data.assignedToId) {
            const txResult = await runAssignmentTransaction(ticketId, data.assignedToId, tracklistId)
            if (!txResult.success) {
                console.error('Assignment transaction failed after ticket update:', txResult.error)
            }
        }

        revalidatePath(`/tracklists/${tracklistId}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') }
    }
}

export async function getAllTracklistsWithTickets(locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') } as const
    }

    try {
        const tracklists = await db.tracklist.findMany({
            orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
            include: {
                _count: { select: { tickets: true } },
                createdBy: { select: { id: true, name: true, username: true } },
                tickets: {
                    include: ticketDetailsInclude,
                },
            },
        })

        const sorted = tracklists.map((tl) => ({
            ...tl,
            tickets: sortTicketsByPriorityAndNumber(tl.tickets.map(enrichTicketScripts)),
        }))

        return { success: true, data: sorted } as const
    } catch (error) {
        console.error('Error fetching all tracklists with tickets:', error)
        return { success: false, error: t(locale, 'errors.fetchError') } as const
    }
}

export async function completeTicket(ticketId: number, tracklistId: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') } as const
    }

    try {
        const ticket = await db.ticketQA.findUnique({ where: { id: ticketId, tracklistId } })
        if (!ticket) {
            return { success: false, error: 'Ticket no encontrado' } as const
        }
        if (ticket.status !== TicketQAStatus.TEST) {
            return { success: false, error: 'Solo se pueden completar tickets en estado Test' } as const
        }
        await db.ticketQA.update({
            where: { id: ticketId },
            data: { status: TicketQAStatus.COMPLETED },
        })

        if (ticket.incidenceId) {
            await completeIncidenceCore(ticket.incidenceId)
            revalidatePath('/incidences')
        }

        revalidatePath('/tracklists')
        revalidatePath(`/tracklists/${tracklistId}`)
        return { success: true } as const
    } catch (error) {
        console.error('Error completing ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') } as const
    }
}
export async function completeTracklist(id: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) return { success: false, error: t(locale, 'auth.unauthorized') }
    try {
        const testTickets = await db.ticketQA.findMany({
            where: { tracklistId: id, status: TicketQAStatus.TEST },
        })

        if (testTickets.length > 0) {
            await db.ticketQA.updateMany({
                where: { tracklistId: id, status: TicketQAStatus.TEST },
                data: { status: TicketQAStatus.COMPLETED },
            })

            const incidenceIds = [...new Set(
                testTickets.filter(t => t.incidenceId).map(t => t.incidenceId!)
            )]
            for (const incId of incidenceIds) {
                await completeIncidenceCore(incId)
            }
        }

        await db.tracklist.update({
            where: { id },
            data: {
                status: TracklistStatus.COMPLETED,
                completedAt: new Date(),
                completedById: Number(session.user.id),
            },
        })
        revalidatePath('/tracklists')
        revalidatePath('/incidences')
        return { success: true }
    } catch (error) {
        console.error('Error completing tracklist:', error)
        return { success: false, error: 'Error al completar el tracklist' }
    }
}

export async function archiveTracklist(id: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) return { success: false, error: t(locale, 'auth.unauthorized') }
    try {
        await db.tracklist.update({
            where: { id },
            data: { status: TracklistStatus.ARCHIVED },
        })
        revalidatePath('/tracklists')
        return { success: true }
    } catch (error) {
        console.error('Error archiving tracklist:', error)
        return { success: false, error: 'Error al archivar el tracklist' }
    }
}

export async function getGanttData() {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' } as const

    try {
        const tracklists = await db.tracklist.findMany({
            orderBy: [{ dueDate: { sort: 'asc', nulls: 'last' } }],
            select: {
                id: true, title: true, description: true, dueDate: true, status: true,
                externalWorkItems: {
                    select: {
                        incidences: {
                            where: { status: { notIn: [TaskStatus.DISMISSED, TaskStatus.BACKLOG] } },
                            select: {
                                id: true, description: true, status: true, priority: true,
                                startedAt: true, completedAt: true, estimatedTime: true, createdAt: true,
                                externalWorkItem: { select: externalWorkItemBaseSelect },
                                technology: { select: { name: true } },
                                assignments: {
                                    where: { isAssigned: true },
                                    select: {
                                        user: { select: { id: true, name: true, username: true } },
                                        tasks: { select: { id: true, isCompleted: true } }
                                    }
                                },
                                qaTickets: {
                                    select: { id: true, ticketNumber: true, createdAt: true },
                                    take: 1,
                                },
                            }
                        }
                    }
                }
            }
        })

        const data = tracklists.map((tl) => {
            const seen = new Set<number>()
            const incidences = tl.externalWorkItems.flatMap((ewi) =>
                ewi.incidences.filter((inc) => {
                    if (seen.has(inc.id)) return false
                    seen.add(inc.id)
                    return true
                }).map((inc) => ({
                    ...inc,
                    externalWorkItem: serializeExternalWorkItem(inc.externalWorkItem),
                    status: inc.status as import('@/types/enums').TaskStatus,
                    ticket: inc.qaTickets[0] ?? null,
                }))
            )
            return {
                id: tl.id,
                title: tl.title,
                description: tl.description,
                dueDate: tl.dueDate,
                status: tl.status,
                incidences,
            }
        })

        return { success: true, data } as const
    } catch (error) {
        console.error('Error fetching gantt data:', error)
        return { success: false, error: 'Error al obtener datos del Gantt' } as const
    }
}

export async function uncompleteTicket(ticketId: number, tracklistId: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') } as const
    }

    try {
        const ticket = await db.ticketQA.findUnique({ where: { id: ticketId, tracklistId } })
        if (!ticket) {
            return { success: false, error: 'Ticket no encontrado' } as const
        }
        if (ticket.status !== TicketQAStatus.COMPLETED) {
            return { success: false, error: 'Solo se pueden descompletar tickets en estado Completado' } as const
        }
        await db.ticketQA.update({
            where: { id: ticketId },
            data: { status: TicketQAStatus.TEST },
        })

        if (ticket.incidenceId) {
            await db.incidence.update({
                where: { id: ticket.incidenceId, status: TaskStatus.DONE },
                data: { status: TaskStatus.REVIEW, completedAt: null },
            })
            revalidatePath('/incidences')
        }

        revalidatePath('/tracklists')
        revalidatePath(`/tracklists/${tracklistId}`)
        return { success: true } as const
    } catch (error) {
        console.error('Error uncompleting ticket:', error)
        return { success: false, error: t(locale, 'errors.saveError') } as const
    }
}
