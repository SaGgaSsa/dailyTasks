'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Filter, Search, Users } from 'lucide-react'
import type { Notification, User } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { Input } from '@/components/ui/input'
import { markNotificationAsRead, markNotificationAsUnread, markAllNotificationsAsRead } from '@/app/actions/notifications'
import { NOTIFICATION_EVENT } from '@/components/providers/notification-stream-provider'
import { toast } from 'sonner'
import type { SSENotificationPayload } from '@/lib/sse/emit'
import { NOTIFICATION_TYPE_LABELS, NotificationType } from '@/types/enums'
import { NotificationDetail } from '@/components/inbox/notification-detail'
import { NotificationListItem, type InboxNotification } from '@/components/inbox/notification-list-item'

interface InboxClientProps {
    currentUserId: number
    initialNotifications: InboxNotification[]
    isAdmin: boolean
    total: number
    users: User[]
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

function getCurrentUserSummary(users: User[], currentUserId: number) {
    const user = users.find(item => item.id === currentUserId)

    return {
        id: currentUserId,
        name: user?.name ?? null,
    }
}

export function InboxClient({
    currentUserId,
    initialNotifications,
    isAdmin,
    total,
    users,
}: InboxClientProps) {
    const router = useRouter()
    const [notifications, setNotifications] = useState<InboxNotification[]>(initialNotifications)
    const [selectedId, setSelectedId] = useState<number | null>(initialNotifications[0]?.id ?? null)
    const [searchText, setSearchText] = useState('')
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()
    const currentUser = getCurrentUserSummary(users, currentUserId)

    const unreadCount = notifications.filter(notification => !notification.isRead).length
    const typeOptions = Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))
    const typeValues = Object.values(NotificationType)
    const userOptions = users.map(user => ({
        value: String(user.id),
        label: user.name ?? user.username,
    }))
    const userValues = userOptions.map(user => user.value)

    const filteredNotifications = useMemo(() => {
        const normalizedSearch = searchText.trim().toLowerCase()

        return notifications.filter(notification => {
            if (normalizedSearch && !notification.message.toLowerCase().includes(normalizedSearch)) {
                return false
            }

            if (selectedTypes.length > 0 && !selectedTypes.includes(notification.type)) {
                return false
            }

            if (isAdmin && selectedUserIds.length > 0 && !selectedUserIds.includes(String(notification.userId))) {
                return false
            }

            return true
        })
    }, [isAdmin, notifications, searchText, selectedTypes, selectedUserIds])

    const effectiveSelectedId = filteredNotifications.some(notification => notification.id === selectedId)
        ? selectedId
        : (filteredNotifications[0]?.id ?? null)
    const selectedNotification = filteredNotifications.find(notification => notification.id === effectiveSelectedId) ?? null

    useEffect(() => {
        const handleNotificationReceived = (event: Event) => {
            const payload = (event as CustomEvent<SSENotificationPayload>).detail
            const incoming: InboxNotification = {
                id: payload.id,
                type: payload.type,
                message: payload.message,
                referenceId: payload.referenceId,
                referenceType: payload.referenceType,
                createdAt: new Date(payload.createdAt),
                isRead: false,
                userId: currentUserId,
                ...(isAdmin ? { user: currentUser } : {}),
            }

            setNotifications(prev => [incoming, ...prev.filter(notification => notification.id !== incoming.id)])
            setSelectedId(prev => prev ?? incoming.id)
        }

        window.addEventListener(NOTIFICATION_EVENT, handleNotificationReceived)
        return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotificationReceived)
    }, [currentUser, currentUserId, isAdmin])

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

    const handleToggleRead = (notification: InboxNotification) => {
        if (notification.userId !== currentUserId) return

        if (notification.isRead) {
            handleMarkAsUnread(notification.id)
            return
        }

        handleMarkAsRead(notification.id)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold">Bandeja de entrada</h1>
                    {unreadCount > 0 && <Badge variant="secondary">{unreadCount} sin leer</Badge>}
                </div>

                <div className="relative min-w-[240px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchText}
                        onChange={event => setSearchText(event.target.value)}
                        placeholder="Buscar notificaciones..."
                        className="pl-9"
                    />
                </div>

                <FilterDropdown
                    icon={<Filter className="h-4 w-4" />}
                    options={typeOptions}
                    selectedValues={selectedTypes}
                    allValues={typeValues}
                    onValuesChange={setSelectedTypes}
                />

                {isAdmin && (
                    <FilterDropdown
                        icon={<Users className="h-4 w-4" />}
                        options={userOptions}
                        selectedValues={selectedUserIds}
                        allValues={userValues}
                        onValuesChange={setSelectedUserIds}
                    />
                )}

                {!isAdmin && unreadCount > 0 && (
                    <Button
                        variant="outline"
                        className="ml-auto"
                        onClick={handleMarkAllAsRead}
                        disabled={isPending}
                    >
                        <CheckCheck className="h-4 w-4" />
                        Marcar todas como leídas
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-border bg-card">
                    <div className="max-h-[70vh] overflow-y-auto p-3">
                        {filteredNotifications.length === 0 ? (
                            <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                                No hay notificaciones que coincidan con los filtros actuales.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredNotifications.map(notification => (
                                    <NotificationListItem
                                        key={notification.id}
                                        notification={notification}
                                        isSelected={notification.id === effectiveSelectedId}
                                        onClick={() => setSelectedId(notification.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <NotificationDetail
                    notification={selectedNotification}
                    onNavigate={() => {
                        if (!selectedNotification) return

                        const href = getNotificationHref(selectedNotification)
                        if (href) router.push(href)
                    }}
                    onToggleRead={() => {
                        if (!selectedNotification) return
                        handleToggleRead(selectedNotification)
                    }}
                    isPending={isPending}
                    canToggleRead={selectedNotification?.userId === currentUserId}
                />
            </div>

            {total > notifications.length && (
                <p className="text-center text-xs text-muted-foreground">
                    Mostrando {notifications.length} de {total} notificaciones
                </p>
            )}
        </div>
    )
}
