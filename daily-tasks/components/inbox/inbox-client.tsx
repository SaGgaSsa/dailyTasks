'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, CheckCheck, Circle, Dot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { markNotificationAsRead, markNotificationAsUnread, markAllNotificationsAsRead } from '@/app/actions/notifications'
import { toast } from 'sonner'
import type { Notification } from '@prisma/client'

interface InboxClientProps {
    initialNotifications: Notification[]
    total: number
}

function getNotificationHref(notification: Notification): string | null {
    if (notification.referenceType === 'tracklist') {
        return `/tracklists/${notification.referenceId}`
    }
    if (notification.referenceType === 'incidence') {
        return `/incidences/${notification.referenceId}`
    }
    return null
}

export function InboxClient({ initialNotifications, total }: InboxClientProps) {
    const router = useRouter()
    const [notifications, setNotifications] = useState(initialNotifications)
    const [isPending, startTransition] = useTransition()

    const unreadCount = notifications.filter(n => !n.isRead).length

    const handleMarkAsRead = (id: number) => {
        startTransition(async () => {
            const result = await markNotificationAsRead(id)
            if (result.success) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                )
            } else {
                toast.error(result.error || 'Error al marcar como leída')
            }
        })
    }

    const handleMarkAsUnread = (id: number) => {
        startTransition(async () => {
            const result = await markNotificationAsUnread(id)
            if (result.success) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: false } : n)
                )
            } else {
                toast.error(result.error || 'Error al marcar como no leída')
            }
        })
    }

    const handleMarkAllAsRead = () => {
        startTransition(async () => {
            const result = await markAllNotificationsAsRead()
            if (result.success) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                toast.success('Todas las notificaciones marcadas como leídas')
            } else {
                toast.error(result.error || 'Error al marcar todas como leídas')
            }
        })
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            handleMarkAsRead(notification.id)
        }
        const href = getNotificationHref(notification)
        if (href) router.push(href)
    }

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
                <Bell className="h-12 w-12 opacity-20" />
                <p className="text-sm">No tienes notificaciones</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold">Bandeja de entrada</h1>
                    {unreadCount > 0 && (
                        <Badge variant="secondary">{unreadCount} sin leer</Badge>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={handleMarkAllAsRead}
                        disabled={isPending}
                    >
                        <CheckCheck className="h-4 w-4" />
                        Marcar todas como leídas
                    </Button>
                )}
            </div>

            <div className="flex flex-col gap-1">
                {notifications.map(notification => (
                    <div
                        key={notification.id}
                        className={`group flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            notification.isRead
                                ? 'hover:bg-muted/50'
                                : 'bg-primary/5 hover:bg-primary/10'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        <div className="mt-1 flex-shrink-0">
                            {notification.isRead
                                ? <Circle className="h-2 w-2 text-transparent" />
                                : <Dot className="h-4 w-4 text-primary -ml-1" />
                            }
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm ${notification.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                                {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
                            </p>
                        </div>
                        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            {notification.isRead ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground"
                                    onClick={() => handleMarkAsUnread(notification.id)}
                                    disabled={isPending}
                                >
                                    Marcar como no leída
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs text-muted-foreground"
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    disabled={isPending}
                                >
                                    Marcar como leída
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {total > notifications.length && (
                <p className="text-center text-xs text-muted-foreground mt-6">
                    Mostrando {notifications.length} de {total} notificaciones
                </p>
            )}
        </div>
    )
}
