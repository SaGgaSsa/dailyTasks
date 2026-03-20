'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, CheckCheck, Dot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getUnreadInboxMessagesCount, getInboxMessages, markInboxMessageAsRead, markAllInboxMessagesAsRead } from '@/app/actions/inbox-messages'
import { INBOX_MESSAGE_EVENT } from '@/components/providers/inbox-message-stream-provider'
import type { SSEInboxMessagePayload } from '@/lib/sse/emit'
import type { InboxMessage } from '@prisma/client'

export function NotificationsPopover() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [messages, setMessages] = useState<InboxMessage[]>([])
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        getUnreadInboxMessagesCount().then(result => {
            if (result.success && result.data) setUnreadCount(result.data.count)
        })
    }, [])

    useEffect(() => {
        if (!open) return
        getInboxMessages(1, 10).then(result => {
            if (result.success && result.data) {
                setMessages(result.data.messages)
                setUnreadCount(result.data.messages.filter(message => !message.isRead).length)
            }
        })
    }, [open])

    useEffect(() => {
        const handleSSEInboxMessage = (e: Event) => {
            const payload = (e as CustomEvent<SSEInboxMessagePayload>).detail
            setUnreadCount(prev => prev + 1)
            if (open) {
                const incoming: InboxMessage = {
                    id: payload.id,
                    type: payload.type,
                    message: payload.message,
                    referenceId: payload.referenceId,
                    referenceType: payload.referenceType,
                    createdAt: new Date(payload.createdAt),
                    isRead: false,
                    userId: 0,
                }
                setMessages(prev => [incoming, ...prev])
            }
        }

        window.addEventListener(INBOX_MESSAGE_EVENT, handleSSEInboxMessage)
        return () => window.removeEventListener(INBOX_MESSAGE_EVENT, handleSSEInboxMessage)
    }, [open])

    const handleMarkAsRead = (id: number) => {
        startTransition(async () => {
            const result = await markInboxMessageAsRead(id)
            if (result.success) {
                setMessages(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
                setUnreadCount(prev => Math.max(0, prev - 1))
            }
        })
    }

    const handleMarkAllAsRead = () => {
        startTransition(async () => {
            const result = await markAllInboxMessagesAsRead()
            if (result.success) {
                setMessages(prev => prev.map(n => ({ ...n, isRead: true })))
                setUnreadCount(0)
            }
        })
    }

    const handleMessageClick = (message: InboxMessage) => {
        if (!message.isRead) handleMarkAsRead(message.id)
        setOpen(false)

        if (message.referenceType === 'tracklist') {
            router.push(`/tracklists/${message.referenceId}`)
        } else if (message.referenceType === 'incidence') {
            router.push(`/incidences/${message.referenceId}`)
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
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                            <Bell className="h-6 w-6 opacity-20" />
                            <p className="text-xs">Sin notificaciones</p>
                        </div>
                    ) : (
                        messages.map(message => (
                            <div
                                key={message.id}
                                className={`flex items-start gap-2 px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-0 ${
                                    message.isRead ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
                                }`}
                                onClick={() => handleMessageClick(message)}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {!message.isRead && <Dot className="h-4 w-4 text-primary -ml-1" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-relaxed ${message.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                                        {message.message}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: es })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t border-border px-4 py-2">
                    <Link href="/inbox" onClick={() => setOpen(false)}>
                        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground">
                            Ver mensajes
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    )
}
