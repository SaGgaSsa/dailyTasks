'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, CheckCheck, Dot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getUnreadNotificationsCount, getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications'
import { NOTIFICATION_EVENT } from '@/components/providers/notification-stream-provider'
import type { SSENotificationPayload } from '@/lib/sse/emit'
import type { Notification } from '@prisma/client'

export function NotificationsPopover() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        getUnreadNotificationsCount().then(result => {
            if (result.success && result.data) setUnreadCount(result.data.count)
        })
    }, [])

    useEffect(() => {
        if (!open) return
        getNotifications(1, 10).then(result => {
            if (result.success && result.data) {
                setNotifications(result.data.notifications)
                setUnreadCount(result.data.notifications.filter(n => !n.isRead).length)
            }
        })
    }, [open])

    useEffect(() => {
        const handleSSENotification = (e: Event) => {
            const payload = (e as CustomEvent<SSENotificationPayload>).detail
            setUnreadCount(prev => prev + 1)
            if (open) {
                const incoming: Notification = {
                    id: payload.id,
                    type: payload.type,
                    message: payload.message,
                    referenceId: payload.referenceId,
                    referenceType: payload.referenceType,
                    createdAt: new Date(payload.createdAt),
                    isRead: false,
                    userId: 0,
                }
                setNotifications(prev => [incoming, ...prev])
            }
        }

        window.addEventListener(NOTIFICATION_EVENT, handleSSENotification)
        return () => window.removeEventListener(NOTIFICATION_EVENT, handleSSENotification)
    }, [open])

    const handleMarkAsRead = (id: number) => {
        startTransition(async () => {
            const result = await markNotificationAsRead(id)
            if (result.success) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        })
    }

    const handleMarkAllAsRead = () => {
        startTransition(async () => {
            const result = await markAllNotificationsAsRead()
            if (result.success) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
                setUnreadCount(0)
            }
        })
    }

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) handleMarkAsRead(notification.id)
        setOpen(false)

        if (notification.referenceType === 'tracklist') {
            router.push(`/tracklists/${notification.referenceId}`)
        } else if (notification.referenceType === 'incidence') {
            router.push(`/incidences/${notification.referenceId}`)
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="text-sm font-semibold">Notificaciones</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAllAsRead}
                            disabled={isPending}
                        >
                            <CheckCheck className="h-3 w-3" />
                            Marcar todas
                        </Button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                            <Bell className="h-6 w-6 opacity-20" />
                            <p className="text-xs">Sin notificaciones</p>
                        </div>
                    ) : (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`flex items-start gap-2 px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-0 ${
                                    notification.isRead ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {!notification.isRead && <Dot className="h-4 w-4 text-primary -ml-1" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-relaxed ${notification.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        {notification.message}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t border-border px-4 py-2">
                    <Link href="/inbox" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                            Ver bandeja de entrada
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}
