'use server'

import { db } from '@/lib/db'
import { NotificationType } from '@/types/enums'
import { auth } from '@/auth'
import { emitNotificationToUsers } from '@/lib/sse/emit'

export async function getUnreadNotificationsCount() {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    const userId = Number(session.user.id)
    const count = await db.notification.count({
        where: { userId, isRead: false }
    })
    return { success: true, data: { count } }
}

export async function getNotifications(page = 1, limit = 20) {
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
}

export async function markNotificationAsRead(notificationId: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    const userId = Number(session.user.id)
    const notification = await db.notification.findUnique({ where: { id: notificationId } })
    if (!notification || notification.userId !== userId) {
        return { success: false, error: 'Notificación no encontrada' }
    }

    await db.notification.update({ where: { id: notificationId }, data: { isRead: true } })
    return { success: true }
}

export async function markNotificationAsUnread(notificationId: number) {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    const userId = Number(session.user.id)
    const notification = await db.notification.findUnique({ where: { id: notificationId } })
    if (!notification || notification.userId !== userId) {
        return { success: false, error: 'Notificación no encontrada' }
    }

    await db.notification.update({ where: { id: notificationId }, data: { isRead: false } })
    return { success: true }
}

export async function markAllNotificationsAsRead() {
    const session = await auth()
    if (!session?.user) return { success: false, error: 'No autorizado' }

    const userId = Number(session.user.id)
    await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
    })
    return { success: true }
}

export async function createNotificationsForUsers(
    userIds: number[],
    type: NotificationType,
    referenceId: number,
    referenceType: string,
    message: string,
) {
    if (userIds.length === 0) return

    const created = await db.notification.createMany({
        data: userIds.map(userId => ({
            type,
            referenceId,
            referenceType,
            message,
            userId,
        })),
        skipDuplicates: true,
    })

    if (created.count > 0) {
        const now = new Date()
        emitNotificationToUsers(userIds, { id: 0, type, message, referenceId, referenceType, createdAt: now })
    }
}
