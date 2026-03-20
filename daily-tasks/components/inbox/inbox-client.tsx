'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck, Filter, Users } from 'lucide-react'
import type { InboxMessage, User } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FilterDropdown } from '@/components/ui/filter-dropdown'
import { FilterToolbar } from '@/components/ui/filter-toolbar'
import { SearchBar } from '@/components/ui/search-bar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { markInboxMessageAsRead, markInboxMessageAsUnread, markAllInboxMessagesAsRead } from '@/app/actions/inbox-messages'
import { INBOX_MESSAGE_EVENT } from '@/components/providers/inbox-message-stream-provider'
import { toast } from 'sonner'
import type { SSEInboxMessagePayload } from '@/lib/sse/emit'
import { INBOX_MESSAGE_TYPE_LABELS, InboxMessageType } from '@/types/enums'
import { InboxMessageDetail } from '@/components/inbox/inbox-message-detail'
import { InboxMessageListItem, type InboxMessageRecord } from '@/components/inbox/inbox-message-list-item'

interface InboxClientProps {
    currentUserId: number
    initialMessages: InboxMessageRecord[]
    isAdmin: boolean
    total: number
    users: User[]
}

function getInboxMessageHref(message: InboxMessage): string | null {
    if (message.referenceType === 'tracklist') {
        return `/tracklists/${message.referenceId}`
    }
    if (message.referenceType === 'incidence') {
        return `/incidences/${message.referenceId}`
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
    initialMessages,
    isAdmin,
    total,
    users,
}: InboxClientProps) {
    const router = useRouter()
    const [messages, setMessages] = useState<InboxMessageRecord[]>(initialMessages)
    const [selectedId, setSelectedId] = useState<number | null>(initialMessages[0]?.id ?? null)
    const [searchText, setSearchText] = useState('')
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
    const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'unread'>('all')
    const [isPending, startTransition] = useTransition()
    const currentUser = getCurrentUserSummary(users, currentUserId)

    const unreadCount = messages.filter(message => !message.isRead).length
    const typeOptions = Object.entries(INBOX_MESSAGE_TYPE_LABELS).map(([value, label]) => ({ value, label }))
    const typeValues = Object.values(InboxMessageType)
    const userOptions = users.map(user => ({
        value: String(user.id),
        label: user.name ?? user.username,
    }))
    const userValues = userOptions.map(user => user.value)

    const filteredMessages = useMemo(() => {
        const normalizedSearch = searchText.trim().toLowerCase()

        return messages.filter(message => {
            if (normalizedSearch && !message.message.toLowerCase().includes(normalizedSearch)) {
                return false
            }

            if (selectedTypes.length > 0 && !selectedTypes.includes(message.type)) {
                return false
            }

            if (isAdmin && selectedUserIds.length > 0 && !selectedUserIds.includes(String(message.userId))) {
                return false
            }

            if (visibilityFilter === 'unread' && message.isRead) {
                return false
            }

            return true
        })
    }, [isAdmin, messages, searchText, selectedTypes, selectedUserIds, visibilityFilter])

    const effectiveSelectedId = filteredMessages.some(message => message.id === selectedId)
        ? selectedId
        : (filteredMessages[0]?.id ?? null)
    const selectedMessage = filteredMessages.find(message => message.id === effectiveSelectedId) ?? null

    useEffect(() => {
        const handleInboxMessageReceived = (event: Event) => {
            const payload = (event as CustomEvent<SSEInboxMessagePayload>).detail
            const incoming: InboxMessageRecord = {
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

            setMessages(prev => [incoming, ...prev.filter(message => message.id !== incoming.id)])
            setSelectedId(prev => prev ?? incoming.id)
        }

        window.addEventListener(INBOX_MESSAGE_EVENT, handleInboxMessageReceived)
        return () => window.removeEventListener(INBOX_MESSAGE_EVENT, handleInboxMessageReceived)
    }, [currentUser, currentUserId, isAdmin])

    const handleMarkAsRead = (id: number) => {
        startTransition(async () => {
            const result = await markInboxMessageAsRead(id)
            if (result.success) {
                setMessages(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                )
            } else {
                toast.error(result.error || 'Error al marcar como leído')
            }
        })
    }

    const handleMarkAsUnread = (id: number) => {
        startTransition(async () => {
            const result = await markInboxMessageAsUnread(id)
            if (result.success) {
                setMessages(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: false } : n)
                )
            } else {
                toast.error(result.error || 'Error al marcar como no leído')
            }
        })
    }

    const handleMarkAllAsRead = () => {
        startTransition(async () => {
            const result = await markAllInboxMessagesAsRead()
            if (result.success) {
                setMessages(prev => prev.map(n => ({ ...n, isRead: true })))
                toast.success('Todos los mensajes marcados como leídos')
            } else {
                toast.error(result.error || 'Error al marcar todos como leídos')
            }
        })
    }

    const handleToggleRead = (message: InboxMessageRecord) => {
        if (message.userId !== currentUserId) return

        if (message.isRead) {
            handleMarkAsUnread(message.id)
            return
        }

        handleMarkAsRead(message.id)
    }

    return (
        <div className="space-y-6">
            <div>
                <FilterToolbar
                    startContent={
                        <>
                            <SearchBar
                                value={searchText}
                                onChange={setSearchText}
                                placeholder="Buscar mensajes..."
                                className="w-[240px]"
                            />

                            <FilterDropdown
                                icon={<Filter className="h-4 w-4" />}
                                options={typeOptions}
                                selectedValues={selectedTypes}
                                allValues={typeValues}
                                onValuesChange={setSelectedTypes}
                            />

                            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} sin leer</Badge>}

                            {isAdmin && (
                                <FilterDropdown
                                    icon={<Users className="h-4 w-4" />}
                                    options={userOptions}
                                    selectedValues={selectedUserIds}
                                    allValues={userValues}
                                    onValuesChange={setSelectedUserIds}
                                />
                            )}
                        </>
                    }
                    endContent={
                        <>
                            {!isAdmin && unreadCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleMarkAllAsRead}
                                    disabled={isPending}
                                    title="Marcar todos como leídos"
                                    aria-label="Marcar todos como leídos"
                                >
                                    <CheckCheck className="h-4 w-4" />
                                </Button>
                            )}
                            <Tabs
                                value={visibilityFilter}
                                onValueChange={value => setVisibilityFilter(value as 'all' | 'unread')}
                            >
                                <TabsList className="h-8 border border-border bg-muted">
                                    <TabsTrigger value="all" className="px-3 data-[state=active]:bg-accent">
                                        Todos
                                    </TabsTrigger>
                                    <TabsTrigger value="unread" className="px-3 data-[state=active]:bg-accent">
                                        Sin leer
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </>
                    }
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
                <div className="rounded-2xl border border-border bg-card">
                    <div className="max-h-[70vh] overflow-y-auto p-3">
                        {filteredMessages.length === 0 ? (
                            <div className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                                No hay mensajes que coincidan con los filtros actuales.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredMessages.map(message => (
                                    <InboxMessageListItem
                                        key={message.id}
                                        message={message}
                                        isSelected={message.id === effectiveSelectedId}
                                        onClick={() => setSelectedId(message.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <InboxMessageDetail
                    message={selectedMessage}
                    onNavigate={() => {
                        if (!selectedMessage) return

                        const href = getInboxMessageHref(selectedMessage)
                        if (href) router.push(href)
                    }}
                    onToggleRead={() => {
                        if (!selectedMessage) return
                        handleToggleRead(selectedMessage)
                    }}
                    isPending={isPending}
                    canToggleRead={selectedMessage?.userId === currentUserId}
                />
            </div>

            {total > messages.length && (
                <p className="text-center text-xs text-muted-foreground">
                    Mostrando {messages.length} de {total} mensajes
                </p>
            )}
        </div>
    )
}
