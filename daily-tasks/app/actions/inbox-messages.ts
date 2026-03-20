'use server'

import { db } from '@/lib/db'
import { InboxMessageType, UserRole } from '@/types/enums'
import { auth } from '@/auth'
import { emitInboxMessageToUsers } from '@/lib/sse/emit'

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

        return { success: true, data: { messages, total, page, limit } }
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

        return { success: true, data: { messages, total, page, limit } }
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
