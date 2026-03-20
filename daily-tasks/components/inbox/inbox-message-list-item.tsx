'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Bell, XCircle } from 'lucide-react'
import type { InboxMessageWithContext } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { INBOX_MESSAGE_TYPE_LABELS, InboxMessageType } from '@/types/enums'

interface InboxMessageListItemProps {
    message: InboxMessageWithContext
    isSelected: boolean
    onClick: () => void
}

function getInboxMessageIcon(type: string) {
    if (type === InboxMessageType.TICKET_BLOCKER_CREATED) {
        return <AlertTriangle className="h-4 w-4 text-amber-400" />
    }

    if (type === InboxMessageType.TICKET_REJECTED) {
        return <XCircle className="h-4 w-4 text-red-400" />
    }

    return <Bell className="h-4 w-4 text-muted-foreground" />
}

function getInboxMessageTitle(message: string) {
    const [firstLine] = message.split('\n')
    return firstLine.trim()
}

function getInboxMessageSubtitle(message: string) {
    const lines = message
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

    if (lines.length <= 1) return ''

    return lines.slice(1).join(' ')
}

export function InboxMessageListItem({
    message,
    isSelected,
    onClick,
}: InboxMessageListItemProps) {
    const title = message.ticketContext?.description || getInboxMessageTitle(message.message)
    const subtitle = message.ticketContext?.rejectionTask?.title || message.ticketContext?.observations || getInboxMessageSubtitle(message.message)

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex w-full flex-col gap-3 rounded-xl border border-border/60 p-4 text-left transition-colors',
                isSelected && 'bg-accent',
                !isSelected && message.isRead && 'hover:bg-muted/40',
                !isSelected && !message.isRead && 'bg-primary/5 hover:bg-primary/10'
            )}
        >
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    {getInboxMessageIcon(message.type)}
                </div>
                <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', !message.isRead && 'font-medium')}>
                        {title}
                    </p>
                    {subtitle && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{INBOX_MESSAGE_TYPE_LABELS[message.type]}</Badge>
                <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(message.createdAt), {
                        addSuffix: true,
                        locale: es,
                    })}
                </span>
            </div>
        </button>
    )
}
