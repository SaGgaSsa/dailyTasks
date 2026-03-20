'use server'

import { db } from '@/lib/db'
import { NotificationType, UserRole } from '@/types/enums'
import { auth } from '@/auth'
import { emitNotificationToUsers } from '@/lib/sse/emit'

export async function getUnreadNotificationsCount() {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const count = await db.notification.count({
            where: { userId, isRead: false }
        })

        return { success: true, data: { count } }
    } catch (error) {
        console.error('Error getting unread notifications count:', error)
        return { success: false, error: 'Error al obtener el conteo de notificaciones' }
    }
}

export async function getNotifications(page = 1, limit = 20) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const skip = (page - 1) * limit

        const [notifications, total] = await Promise.all([
            db.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            db.notification.count({ where: { userId } }),
        ])

        return { success: true, data: { notifications, total, page, limit } }
    } catch (error) {
        console.error('Error getting notifications:', error)
        return { success: false, error: 'Error al obtener las notificaciones' }
    }
}

export async function getAllNotifications(page = 1, limit = 20, userId?: number) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }
        if (session.user.role !== UserRole.ADMIN) {
            return { success: false, error: 'No autorizado' }
        }

        const skip = (page - 1) * limit
        const where = typeof userId === 'number' ? { userId } : {}

        const [notifications, total] = await Promise.all([
            db.notification.findMany({
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
            db.notification.count({ where }),
        ])

        return { success: true, data: { notifications, total, page, limit } }
    } catch (error) {
        console.error('Error getting all notifications:', error)
        return { success: false, error: 'Error al obtener las notificaciones' }
    }
}

export async function markNotificationAsRead(notificationId: number) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const notification = await db.notification.findUnique({ where: { id: notificationId } })
        if (!notification || notification.userId !== userId) {
            return { success: false, error: 'Notificación no encontrada' }
        }

        await db.notification.update({ where: { id: notificationId }, data: { isRead: true } })
        return { success: true }
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return { success: false, error: 'Error al marcar la notificación como leída' }
    }
}

export async function markNotificationAsUnread(notificationId: number) {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        const notification = await db.notification.findUnique({ where: { id: notificationId } })
        if (!notification || notification.userId !== userId) {
            return { success: false, error: 'Notificación no encontrada' }
        }

        await db.notification.update({ where: { id: notificationId }, data: { isRead: false } })
        return { success: true }
    } catch (error) {
        console.error('Error marking notification as unread:', error)
        return { success: false, error: 'Error al marcar la notificación como no leída' }
    }
}

export async function markAllNotificationsAsRead() {
    try {
        const session = await auth()
        if (!session?.user) return { success: false, error: 'No autorizado' }

        const userId = Number(session.user.id)
        await db.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        })

        return { success: true }
    } catch (error) {
        console.error('Error marking all notifications as read:', error)
        return { success: false, error: 'Error al marcar todas las notificaciones como leídas' }
    }
}

export async function createNotificationsForUsers(
    userIds: number[],
    type: NotificationType,
    referenceId: number,
    referenceType: string,
    message: string,
) {
    if (userIds.length === 0) return

    const createdNotifications = await db.$transaction(
        userIds.map(userId =>
            db.notification.create({
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

    for (const notification of createdNotifications) {
        emitNotificationToUsers([notification.userId], {
            id: notification.id,
            type: notification.type as NotificationType,
            message: notification.message,
            referenceId: notification.referenceId,
            referenceType: notification.referenceType,
            createdAt: notification.createdAt,
        })
    }
}
