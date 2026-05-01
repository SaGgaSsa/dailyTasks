'use server'

import { db } from '@/lib/db'
import { InboxMessageType, UserRole } from '@/types/enums'
import type { InboxMessageTicketContext, InboxMessageWithContext } from '@/types'
import { auth } from '@/auth'
import { emitInboxMessageToUsers } from '@/lib/sse/emit'

async function enrichInboxMessages(messages: InboxMessageWithContext[]): Promise<InboxMessageWithContext[]> {
    const ticketIds = messages
        .filter(message => message.referenceType === 'TICKET_QA')
        .map(message => message.referenceId)

    if (ticketIds.length === 0) {
        return messages
    }

    const tickets = await db.ticketQA.findMany({
        where: { id: { in: ticketIds } },
        select: {
            id: true,
            ticketNumber: true,
            description: true,
            observations: true,
            tracklistId: true,
            assignedToId: true,
            assignedTo: {
                select: {
                    id: true,
                    name: true,
                    username: true,
                },
            },
            externalWorkItem: {
                select: {
                    id: true,
                    externalId: true,
                    workItemType: {
                        select: {
                            name: true,
                            color: true,
                        },
                    },
                },
            },
            incidence: {
                select: {
                    assignments: {
                        select: {
                            userId: true,
                            tasks: {
                                where: { isQaReported: true },
                                orderBy: { createdAt: 'desc' },
                                select: {
                                    title: true,
                                    description: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    })

    const ticketContextById = new Map<number, InboxMessageTicketContext>()

    for (const ticket of tickets) {
        const rejectionAssignment = ticket.assignedToId
            ? ticket.incidence?.assignments.find(assignment => assignment.userId === ticket.assignedToId)
            : null
        const rejectionTask = rejectionAssignment?.tasks[0] ?? null

        ticketContextById.set(ticket.id, {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            description: ticket.description,
            observations: ticket.observations,
            tracklistId: ticket.tracklistId,
            assignedTo: ticket.assignedTo,
            externalWorkItem: ticket.externalWorkItem ? {
                id: ticket.externalWorkItem.id,
                type: ticket.externalWorkItem.workItemType.name,
                externalId: ticket.externalWorkItem.externalId,
                color: ticket.externalWorkItem.workItemType.color,
            } : null,
            rejectionTask: rejectionTask ? {
                title: rejectionTask.title,
                description: rejectionTask.description,
            } : null,
        })
    }

    return messages.map(message => ({
        ...message,
        ticketContext: message.referenceType === 'TICKET_QA'
            ? (ticketContextById.get(message.referenceId) ?? null)
            : null,
    }))
}

export async function getUnreadInboxMessagesCount() {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const count = await db.inboxMessage.count({
            where: { userId, isRead: false }
        })

        return { success: true, data: { count } }
    } catch (error) {
        console.error('Error getting unread inbox messages count:', error)
        return { success: false, error: 'Error al obtener el conteo de mensajes' }
    }
}

export async function getInboxMessages(page = 1, limit = 20) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const skip = (page - 1) * limit

        const [messages, total] = await Promise.all([
            db.inboxMessage.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.inboxMessage.count({ where: { userId } }),
        ])

        const enrichedMessages = await enrichInboxMessages(messages)

        return { success: true, data: { messages: enrichedMessages, total, page, limit } }
    } catch (error) {
        console.error('Error getting inbox messages:', error)
        return { success: false, error: 'Error al obtener los mensajes' }
    }
}

export async function getAllInboxMessages(page = 1, limit = 20, userId?: number) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }
        if (session.user.role !== UserRole.ADMIN) {
            return { success: false, error: 'No autorizado' }
        }

        const skip = (page - 1) * limit
        const where = typeof userId === 'number' ? { userId } : {}

        const [messages, total] = await Promise.all([
            db.inboxMessage.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.inboxMessage.count({ where }),
        ])

        const enrichedMessages = await enrichInboxMessages(messages)

        return { success: true, data: { messages: enrichedMessages, total, page, limit } }
    } catch (error) {
        console.error('Error getting all inbox messages:', error)
        return { success: false, error: 'Error al obtener los mensajes' }
    }
}

export async function markInboxMessageAsRead(messageId: number) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const inboxMessage = await db.inboxMessage.findUnique({ where: { id: messageId } })
        if (!inboxMessage || inboxMessage.userId !== userId) {
            return { success: false, error: 'Mensaje no encontrado' }
        }

        await db.inboxMessage.update({ where: { id: messageId }, data: { isRead: true } })
        return { success: true }
    } catch (error) {
        console.error('Error marking inbox message as read:', error)
        return { success: false, error: 'Error al marcar el mensaje como leído' }
    }
}

export async function markInboxMessageAsUnread(messageId: number) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const inboxMessage = await db.inboxMessage.findUnique({ where: { id: messageId } })
        if (!inboxMessage || inboxMessage.userId !== userId) {
            return { success: false, error: 'Mensaje no encontrado' }
        }

        await db.inboxMessage.update({ where: { id: messageId }, data: { isRead: false } })
        return { success: true }
    } catch (error) {
        console.error('Error marking inbox message as unread:', error)
        return { success: false, error: 'Error al marcar el mensaje como no leído' }
    }
}

export async function markAllInboxMessagesAsRead() {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        await db.inboxMessage.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        })

        return { success: true }
    } catch (error) {
        console.error('Error marking all inbox messages as read:', error)
        return { success: false, error: 'Error al marcar todos los mensajes como leídos' }
    }
}

export async function createInboxMessagesForUsers(
    userIds: number[],
    type: InboxMessageType,
    referenceId: number,
    referenceType: string,
    message: string,
) {
    if (userIds.length === 0) return

    const createdMessages = await db.$transaction(
        userIds.map(userId =>
            db.inboxMessage.create({
                data: {
                    type,
                    referenceId,
                    referenceType,
                    message,
                    userId,
                }
            })
        )
    )

    for (const inboxMessage of createdMessages) {
        emitInboxMessageToUsers([inboxMessage.userId], {
            id: inboxMessage.id,
            type: inboxMessage.type as InboxMessageType,
            message: inboxMessage.message,
            referenceId: inboxMessage.referenceId,
            referenceType: inboxMessage.referenceType,
            createdAt: inboxMessage.createdAt,
        })
    }
}
