'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, ExternalLink, MailCheck, MailOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NOTIFICATION_TYPE_LABELS } from '@/types/enums'
import type { InboxNotification } from '@/components/inbox/notification-list-item'

interface NotificationDetailProps {
    notification: InboxNotification | null
    onNavigate: () => void
    onToggleRead: () => void
    isPending: boolean
    canToggleRead: boolean
}

export function NotificationDetail({
    notification,
    onNavigate,
    onToggleRead,
    isPending,
    canToggleRead,
}: NotificationDetailProps) {
    if (!notification) {
        return (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-muted-foreground">
                <Bell className="h-10 w-10 opacity-30" />
                <div>
                    <p className="text-sm font-medium text-foreground">Selecciona una notificación</p>
                    <p className="text-sm text-muted-foreground">
                        El detalle aparecerá aquí cuando elijas un elemento de la lista.
                    </p>
                </div>
            </div>
        )
    }

    const statusLabel = notification.isRead ? 'Leída' : 'No leída'
    const statusIcon = notification.isRead ? <MailCheck className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />
    const referenceLabel = `${notification.referenceType} #${notification.referenceId}`
    const userLabel = notification.user?.name ?? 'Sin nombre'

    return (
        <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-6">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{NOTIFICATION_TYPE_LABELS[notification.type]}</Badge>
                    <Badge variant="secondary" className="gap-1">
                        {statusIcon}
                        {statusLabel}
                    </Badge>
                </div>
                <div className="mt-4 space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">{notification.message.split('\n')[0].trim()}</h2>
                    <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                            locale: es,
                        })}
                    </p>
                </div>
            </div>

            <div className="flex-1 space-y-6 p-6">
                {notification.user && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Usuario</p>
                        <p className="text-sm text-foreground">{userLabel}</p>
                    </div>
                )}

                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mensaje</p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{notification.message}</p>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Elemento relacionado</p>
                    <p className="text-sm text-foreground">{referenceLabel}</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-6">
                {canToggleRead && (
                    <Button
                        variant="outline"
                        onClick={onToggleRead}
                        disabled={isPending}
                    >
                        {notification.isRead ? 'Marcar como no leída' : 'Marcar como leída'}
                    </Button>
                )}
                <Button onClick={onNavigate} disabled={isPending}>
                    <ExternalLink className="h-4 w-4" />
                    Ir al elemento
                </Button>
            </div>
        </div>
    )
}
