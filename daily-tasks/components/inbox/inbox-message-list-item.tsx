'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Bell, XCircle } from 'lucide-react'
import type { InboxMessage } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { INBOX_MESSAGE_TYPE_LABELS, InboxMessageType } from '@/types/enums'

export type InboxMessageRecord = InboxMessage & {
    user?: {
        id: number
        name: string | null
    }
}

interface InboxMessageListItemProps {
    message: InboxMessageRecord
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
    const title = getInboxMessageTitle(message.message)
    const subtitle = getInboxMessageSubtitle(message.message)

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
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    {getInboxMessageIcon(message.type)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                        {!message.isRead && (
                            <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                        )}
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
