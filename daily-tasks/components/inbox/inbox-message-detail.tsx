'use client'

import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, ExternalLink, MailCheck, MailOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { MarkdownText } from '@/components/ui/markdown-text'
import { INBOX_MESSAGE_TYPE_LABELS } from '@/types/enums'
import { cn } from '@/lib/utils'
import type { InboxMessageWithContext } from '@/types'

interface InboxMessageDetailProps {
    message: InboxMessageWithContext | null
    onNavigate: () => void
    onToggleRead: () => void
    isPending: boolean
    canToggleRead: boolean
}

function isHtmlContent(value: string) {
    return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function InboxMessageDetail({
    message,
    onNavigate,
    onToggleRead,
    isPending,
    canToggleRead,
}: InboxMessageDetailProps) {
    if (!message) {
        return (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center text-muted-foreground">
                <Bell className="h-10 w-10 opacity-30" />
                <div>
                    <p className="text-sm font-medium text-foreground">Selecciona un mensaje</p>
                    <p className="text-sm text-muted-foreground">
                        El detalle aparecerá aquí cuando elijas un elemento de la lista.
                    </p>
                </div>
            </div>
        )
    }

    const statusLabel = message.isRead ? 'Leído' : 'No leído'
    const statusIcon = message.isRead ? <MailCheck className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />
    const ticketContext = message.ticketContext
    const title = ticketContext?.description || message.message.split('\n')[0].trim()
    const body = ticketContext?.rejectionTask?.description || ticketContext?.observations || message.message
    const assigneeLabel = ticketContext?.assignedTo?.name || ticketContext?.assignedTo?.username || 'Sin responsable'
    const navigationLabel = ticketContext
        ? `Ticket ${ticketContext.ticketNumber}`
        : 'Abrir elemento'

    return (
        <div className="flex h-full min-h-[420px] flex-col rounded-2xl border border-border bg-card">
            <div className="border-b border-border p-6">
                <div className="flex flex-wrap items-center gap-2">
                    {ticketContext?.externalWorkItem && (
                        <IncidenceBadge
                            type={ticketContext.externalWorkItem.type}
                            externalId={ticketContext.externalWorkItem.externalId}
                            color={ticketContext.externalWorkItem.color}
                        />
                    )}
                    <Badge variant="outline">{INBOX_MESSAGE_TYPE_LABELS[message.type]}</Badge>
                    <Badge variant="secondary" className="gap-1">
                        {statusIcon}
                        {statusLabel}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                            locale: es,
                        })}
                    </span>
                </div>
                <div className="mt-4 space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                </div>
            </div>

            <div className="flex-1 space-y-6 p-6">
                {isHtmlContent(body) ? (
                    <div
                        className={cn(
                            'prose prose-sm prose-invert max-w-none text-foreground',
                            '[&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-950 [&_pre]:p-3',
                            '[&_code]:rounded [&_code]:bg-zinc-800/80 [&_code]:px-1 [&_code]:py-0.5',
                            '[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5'
                        )}
                        dangerouslySetInnerHTML={{ __html: body }}
                    />
                ) : (
                    <MarkdownText content={body} className="text-foreground" />
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-6">
                <p className="text-sm text-muted-foreground">
                    Responsable: <span className="text-foreground">{assigneeLabel}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    {canToggleRead && (
                        <Button
                            variant="outline"
                            onClick={onToggleRead}
                            disabled={isPending}
                        >
                            {message.isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                        </Button>
                    )}
                    <Button onClick={onNavigate} disabled={isPending}>
                        <ExternalLink className="h-4 w-4" />
                        {navigationLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}
