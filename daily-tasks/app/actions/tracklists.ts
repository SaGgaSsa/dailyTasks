'use server'

import { db } from '@/lib/db'
import { revalidatePath, unstable_cache } from 'next/cache'
import { sortTicketsByPriorityAndNumber } from '@/lib/ticket-sort'
import { auth } from '@/auth'
import { t, Locale } from '@/lib/i18n'
import { getCachedTechsWithModules } from '@/app/actions/tech'
import { createTicketSchema } from '@/types'
import { TicketType, TicketQAStatus, Priority, TracklistStatus, InboxMessageType } from '@/types/enums'
import { createInboxMessagesForUsers } from '@/app/actions/inbox-messages'
import { TaskStatus } from '.prisma/client'
import { completeIncidenceCore } from '@/app/actions/incidence-actions'
import { getReadyForDeployAtPatch } from '@/lib/incidence-management'
import { getPlanningWarnings, getTotalAssignedHours } from '@/lib/planning-diagnostics'
import { getExternalWorkItemById, isExternalWorkItemActive } from '@/lib/external-work-item-guards'
import { externalWorkItemBaseSelect, serializeExternalWorkItem } from '@/lib/work-item-types'
import {
    assignTicketToNewIncidence,
    assignTicketToNewIncidenceCore,
    addTicketDeploymentSummaries,
    enrichTicketScripts,
    ExternalWorkItemStatus,
    ticketDetailsInclude,
} from '@/lib/tracklist-ticket-management'
import { canManageTracklists, getAuthenticatedUser } from '@/lib/authorization'
import {
    deleteTicketImageFile,
    getAllowedTicketImageExtensions,
    getTicketImageMaxBytes,
    hasValidTicketImageMagicBytes,
    isAllowedTicketImageMimeType,
    reconcileTicketImages,
    sanitizeObservationHtml,
    writeTicketImageFile,
} from '@/lib/ticket-images'

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
    environmentId?: number | null
    observations?: string
    assignedToId?: number
    draftId?: string
}

export const getCachedActiveEnvironments = unstable_cache(
    async () => db.environment.findMany({
        where: { isEnabled: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
    }),
    ['active-environments-for-ticket-form'],
    { tags: ['environments'] }
)

async function requireTracklistManager(locale: Locale) {
    const user = await getAuthenticatedUser()

    if (!user) {
        return { success: false, error: t(locale, 'auth.unauthorized') } as const
    }

    if (!canManageTracklists(user.role)) {
        return { success: false, error: t(locale, 'business.tracklistsManageOnly') } as const
    }

    return { success: true, user } as const
}

async function ensureActiveExternalWorkItem(
    externalWorkItemId: number | undefined,
    locale: Locale
): Promise<{ success: true } | { success: false; error: string }> {
    if (externalWorkItemId === undefined) {
        return { success: true }
    }

    const workItem = await getExternalWorkItemById(externalWorkItemId)
    if (!workItem) {
        return { success: false, error: t(locale, 'business.invalidExternalWorkItem') }
    }

    if (!isExternalWorkItemActive(workItem)) {
        return { success: false, error: t(locale, 'business.inactiveExternalWorkItem') }
    }

    return { success: true }
}

async function ensureActiveEnvironment(
    environmentId: number | null | undefined
): Promise<{ success: true } | { success: false; error: string }> {
    if (environmentId === undefined || environmentId === null) {
        return { success: true }
    }

    const environment = await db.environment.findUnique({
        where: { id: environmentId },
        select: { id: true, isEnabled: true },
    })

    if (!environment?.isEnabled) {
        return { success: false, error: 'El ambiente seleccionado no es válido' }
    }

    return { success: true }
}

async function getLatestQaTask(ticket: {
    incidenceId: number | null
    assignedToId: number | null
}) {
    if (!ticket.incidenceId || !ticket.assignedToId) {
        return null
    }

    return db.task.findFirst({
        where: {
            isQaReported: true,
            assignment: {
                incidenceId: ticket.incidenceId,
                userId: ticket.assignedToId,
            },
        },
        orderBy: { createdAt: 'desc' },
        select: {
            title: true,
            description: true,
        },
    })
}

export async function uploadTicketImage(formData: FormData, locale: Locale = 'es') {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' } as const
    }

    const file = formData.get('file')
    const tracklistId = Number(formData.get('tracklistId'))
    const ticketIdValue = formData.get('ticketId')
    const ticketId = ticketIdValue ? Number(ticketIdValue) : null
    const draftId = String(formData.get('draftId') ?? '').trim() || null

    if (!(file instanceof File)) {
        return { success: false, error: 'Archivo inválido' } as const
    }
    if (!Number.isInteger(tracklistId) || tracklistId <= 0) {
        return { success: false, error: 'Tracklist inválido' } as const
    }
    if (ticketId && (!Number.isInteger(ticketId) || ticketId <= 0)) {
        return { success: false, error: 'Ticket inválido' } as const
    }
    if (!ticketId && !draftId) {
        return { success: false, error: 'El borrador es obligatorio para subir imágenes' } as const
    }

    if (!isAllowedTicketImageMimeType(file.type)) {
        return { success: false, error: 'Solo se permiten imágenes JPEG, PNG o WebP' } as const
    }

    const allowedExtensions = getAllowedTicketImageExtensions(file.type)
    const originalExtension = file.name ? `.${file.name.split('.').pop()?.toLowerCase() ?? ''}` : ''
    if (!allowedExtensions || !(allowedExtensions as readonly string[]).includes(originalExtension)) {
        return { success: false, error: 'Solo se permiten imágenes JPEG, PNG o WebP' } as const
    }

    const maxBytes = getTicketImageMaxBytes()
    if (file.size > maxBytes) {
        return { success: false, error: `La imagen supera el tamaño máximo permitido (${maxBytes} bytes)` } as const
    }

    try {
        const [tracklist, ticket] = await Promise.all([
            db.tracklist.findUnique({ where: { id: tracklistId }, select: { id: true } }),
            ticketId
                ? db.ticketQA.findUnique({ where: { id: ticketId, tracklistId }, select: { id: true } })
                : Promise.resolve(null),
        ])

        if (!tracklist) {
            return { success: false, error: 'Tracklist no encontrado' } as const
        }
        if (ticketId && !ticket) {
            return { success: false, error: 'Ticket no encontrado' } as const
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        if (!hasValidTicketImageMagicBytes(bytes, file.type)) {
            return { success: false, error: 'El archivo no parece ser una imagen válida' } as const
        }

        const { url } = await writeTicketImageFile(bytes, allowedExtensions[0])

        try {
            const image = await db.ticketImage.create({
                data: {
                    ticketId: ticketId ?? null,
                    draftId: ticketId ? null : draftId,
                    url,
                    size: file.size,
                    mimeType: file.type,
                    uploadedById: user.id,
                },
                select: { id: true, url: true },
            })

            return { success: true, data: image } as const
        } catch (error) {
            await deleteTicketImageFile(url)
            throw error
        }
    } catch (error) {
        console.error('Error uploading ticket image:', error)
        return { success: false, error: t(locale, 'errors.saveError') } as const
    }
}

export async function assignTicket(
    ticketId: number,
    assignedToId: number,
    tracklistId: number
): Promise<{ success: boolean; error?: string }> {
    const access = await requireTracklistManager('es')
    if (!access.success) return access

    try {
        const ticket = await db.ticketQA.findUnique({
            where: { id: ticketId, tracklistId },
        })
        if (!ticket) return { success: false, error: 'Ticket no encontrado' }
        if (ticket.status !== TicketQAStatus.NEW) {
            return { success: false, error: 'Solo se pueden asignar tickets en estado Nuevo' }
        }
        return assignTicketToNewIncidence(ticketId, assignedToId, tracklistId)
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
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const ticket = await db.ticketQA.findFirst({
            where: { id: ticketId, tracklistId },
            select: {
                assignedToId: true,
                incidence: {
                    select: {
                        assignments: {
                            where: { userId: user.id, isAssigned: true },
                            select: { id: true },
                            take: 1,
                        },
                    },
                },
            },
        })

        if (!ticket) {
            return { success: false, error: 'Ticket no encontrado' }
        }

        const canClear =
            user.role === 'ADMIN' ||
            user.role === 'QA' ||
            ticket.assignedToId === user.id ||
            (user.role === 'DEV' && (ticket.incidence?.assignments.length ?? 0) > 0)

        if (!canClear) {
            return { success: false, error: 'No autorizado' }
        }

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
    const access = await requireTracklistManager(locale)
    if (!access.success) return access

    try {
        for (const externalWorkItemId of data.externalWorkItemIds ?? []) {
            const workItemCheck = await ensureActiveExternalWorkItem(externalWorkItemId, locale)
            if (!workItemCheck.success) {
                return workItemCheck
            }
        }

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
            createdById: access.user.id
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
    const access = await requireTracklistManager(locale)
    if (!access.success) return access

    try {
        for (const externalWorkItemId of data.externalWorkItemIds ?? []) {
            const workItemCheck = await ensureActiveExternalWorkItem(externalWorkItemId, locale)
            if (!workItemCheck.success) {
                return workItemCheck
            }
        }

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
    const access = await requireTracklistManager('es')
    if (!access.success) return access

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
        const enriched = await addTicketDeploymentSummaries(tickets.map(enrichTicketScripts))
        const sorted = sortTicketsByPriorityAndNumber(enriched)
        return { success: true, data: sorted }
    } catch (error) {
        console.error('Error fetching tickets:', error)
        return { success: false, error: t(locale, 'errors.fetchError') }
    }
}

export async function getTicketById(ticketId: number, locale: Locale = 'es') {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: t(locale, 'auth.unauthorized') }
    }

    try {
        const ticket = await db.ticketQA.findUnique({
            where: { id: ticketId },
            include: ticketDetailsInclude,
        })

        if (!ticket) {
            return { success: false, error: 'Ticket no encontrado' }
        }

        const [enrichedTicket, latestQaTask] = await Promise.all([
            addTicketDeploymentSummaries([enrichTicketScripts(ticket)]).then((tickets) => tickets[0]),
            getLatestQaTask(ticket),
        ])

        return {
            success: true,
            data: {
                ...enrichedTicket,
                latestQaTask,
            },
        }
    } catch (error) {
        console.error('Error fetching ticket by id:', error)
        return { success: false, error: t(locale, 'errors.fetchError') }
    }
}

export async function createTicket(tracklistId: number, data: CreateTicketData, locale: Locale = 'es') {
    const access = await requireTracklistManager(locale)
    if (!access.success) return access

    const parsed = createTicketSchema.safeParse(data)
    if (!parsed.success) {
        const errors = parsed.error.issues.map(i => i.message).join(', ')
        return { success: false, error: errors }
    }

    try {
        const workItemCheck = await ensureActiveExternalWorkItem(data.externalWorkItemId, locale)
        if (!workItemCheck.success) {
            return workItemCheck
        }
        const environmentCheck = await ensureActiveEnvironment(data.environmentId)
        if (!environmentCheck.success) {
            return environmentCheck
        }
        if (data.environmentId && data.assignedToId) {
            return { success: false, error: 'Solo se puede indicar ambiente en tickets no asignados' }
        }

        const sessionUserId = access.user.id
        const sanitizedObservations = sanitizeObservationHtml(data.observations)

        const lastTicket = await db.ticketQA.findFirst({
            where: { tracklistId: tracklistId },
            orderBy: { ticketNumber: 'desc' }
        })
        const nextTicketNumber = (lastTicket?.ticketNumber ?? 0) + 1

        const ticket = await db.$transaction(async (tx) => {
            const createdTicket = await tx.ticketQA.create({
                data: {
                    tracklistId: tracklistId,
                    ticketNumber: nextTicketNumber,
                    type: data.type,
                    moduleId: data.moduleId,
                    description: data.description,
                    priority: data.priority,
                    externalWorkItemId: data.externalWorkItemId,
                    environmentId: data.environmentId ?? null,
                    observations: sanitizedObservations,
                    reportedById: sessionUserId,
                }
            })

            await reconcileTicketImages(tx, {
                ticketId: createdTicket.id,
                draftId: data.draftId,
                html: sanitizedObservations,
            })

            if (data.assignedToId) {
                const txResult = await assignTicketToNewIncidenceCore(tx, createdTicket.id, data.assignedToId)
                if (!txResult.success) {
                    throw new Error(txResult.error)
                }
            }

            return createdTicket
        })

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
                await createInboxMessagesForUsers(
                    Array.from(recipientIds),
                    InboxMessageType.TICKET_BLOCKER_CREATED,
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
        return { success: false, error: error instanceof Error ? error.message : t(locale, 'errors.saveError') }
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
    const access = await requireTracklistManager(locale)
    if (!access.success) return access

    if (reason.trim().length < 3) {
        return { success: false, error: t(locale, 'validation.minimumLength', { min: 3 }) }
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
                    dismissedById: access.user.id
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
    const access = await requireTracklistManager(locale)
    if (!access.success) return access
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
    const access = await requireTracklistManager('es')
    if (!access.success) return access

    try {
        const [techsResult, workItemsResult] = await Promise.all([
            getCachedTechsWithModules(),
            getTracklistExternalWorkItems(tracklistId),
        ])
        const environments = await getCachedActiveEnvironments()

        return {
            success: true,
            data: {
                techs: techsResult.techs,
                allModules: techsResult.allModules,
                defaultTech: techsResult.defaultTech,
                defaultModules: techsResult.defaultModules,
                externalWorkItems: workItemsResult.success ? workItemsResult.data : [],
                environments,
            }
        }
    } catch (error) {
        console.error('Error fetching ticket form data:', error)
        return { success: false, error: 'Error al obtener datos del formulario' }
    }
}

export async function updateTicket(ticketId: number, tracklistId: number, data: CreateTicketData, locale: Locale = 'es') {
    const access = await requireTracklistManager(locale)
    if (!access.success) return access

    const parsed = createTicketSchema.safeParse(data)
    if (!parsed.success) {
        const errors = parsed.error.issues.map(i => i.message).join(', ')
        return { success: false, error: errors }
    }

    try {
        const workItemCheck = await ensureActiveExternalWorkItem(data.externalWorkItemId, locale)
        if (!workItemCheck.success) {
            return workItemCheck
        }
        const environmentCheck = await ensureActiveEnvironment(data.environmentId)
        if (!environmentCheck.success) {
            return environmentCheck
        }

        const ticket = await db.ticketQA.findUnique({ where: { id: ticketId, tracklistId } })
        if (!ticket) return { success: false, error: 'Ticket no encontrado' }
        if (ticket.status !== TicketQAStatus.NEW) {
            return { success: false, error: 'Solo se pueden editar tickets en estado Nuevo' }
        }
        if (ticket.assignedToId || ticket.incidenceId) {
            return { success: false, error: 'Solo se pueden editar tickets todavía no asignados' }
        }
        if (data.environmentId && data.assignedToId) {
            return { success: false, error: 'Solo se puede indicar ambiente en tickets no asignados' }
        }

        const sanitizedObservations = sanitizeObservationHtml(data.observations)

        await db.$transaction(async (tx) => {
            await tx.ticketQA.update({
                where: { id: ticketId },
                data: {
                    type: data.type,
                    moduleId: data.moduleId,
                    description: data.description,
                    priority: data.priority,
                    externalWorkItemId: data.externalWorkItemId ?? null,
                    environmentId: data.environmentId ?? null,
                    observations: sanitizedObservations,
                    assignedToId: data.assignedToId ?? null,
                }
            })

            await reconcileTicketImages(tx, {
                ticketId,
                draftId: data.draftId,
                html: sanitizedObservations,
            })

            if (data.assignedToId) {
                const txResult = await assignTicketToNewIncidenceCore(tx, ticketId, data.assignedToId)
                if (!txResult.success) {
                    throw new Error(txResult.error)
                }
            }
        })

        revalidatePath(`/tracklists/${tracklistId}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating ticket:', error)
        return { success: false, error: error instanceof Error ? error.message : t(locale, 'errors.saveError') }
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

        const sorted = await Promise.all(tracklists.map(async (tl) => ({
            ...tl,
            tickets: sortTicketsByPriorityAndNumber(await addTicketDeploymentSummaries(tl.tickets.map(enrichTicketScripts))),
        })))

        return { success: true, data: sorted } as const
    } catch (error) {
        console.error('Error fetching all tracklists with tickets:', error)
        return { success: false, error: t(locale, 'errors.fetchError') } as const
    }
}

export async function completeTicket(ticketId: number, tracklistId: number, locale: Locale = 'es') {
    const access = await requireTracklistManager(locale)
    if (!access.success) return access

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
    const access = await requireTracklistManager(locale)
    if (!access.success) return access
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
                completedById: access.user.id,
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
    const access = await requireTracklistManager(locale)
    if (!access.success) return access
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
                                startedAt: true, completedAt: true, deferredAt: true, estimatedTime: true, createdAt: true,
                                externalWorkItem: { select: externalWorkItemBaseSelect },
                                technology: { select: { name: true } },
                                assignments: {
                                    where: { isAssigned: true },
                                    select: {
                                        assignedHours: true,
                                        user: { select: { id: true, name: true, username: true } },
                                        tasks: { select: { id: true, isCompleted: true } }
                                    }
                                },
                                _count: { select: { scripts: true } },
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
                    totalAssignedHours: getTotalAssignedHours(inc.assignments),
                    planningWarnings: getPlanningWarnings({
                        status: inc.status,
                        estimatedTime: inc.estimatedTime,
                        assignments: inc.assignments,
                        scriptsCount: inc._count.scripts,
                    }),
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
    const access = await requireTracklistManager(locale)
    if (!access.success) return access

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
                data: {
                    status: TaskStatus.REVIEW,
                    completedAt: null,
                    ...getReadyForDeployAtPatch(TaskStatus.DONE, TaskStatus.REVIEW),
                },
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
