'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { UserAvatar } from '@/components/ui/user-avatar'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { toast } from 'sonner'
import { assignTicket, clearTicketUnreadUpdates } from '@/app/actions/tracklists'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { TICKET_TYPE_LABELS, TICKET_QA_STATUS_LABELS, TicketType, TicketQAStatus } from '@/types/enums'

interface Props {
  ticket: TicketQAWithDetails
  tracklistId: number
  assignableUsers: AssignableUser[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TicketDetailModal({ ticket, tracklistId, assignableUsers, open, onOpenChange }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (open && ticket.hasUnreadUpdates) {
      clearTicketUnreadUpdates(ticket.id, tracklistId)
    }
  }, [open, ticket.id, ticket.hasUnreadUpdates, tracklistId])

  const handleAssign = async () => {
    if (!selectedUserId) return
    setIsPending(true)
    const result = await assignTicket(ticket.id, Number(selectedUserId), tracklistId)
    setIsPending(false)
    if (result.success) {
      toast.success('Ticket asignado correctamente')
      onOpenChange(false)
    } else {
      toast.error(result.error || 'Error al asignar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base">#{ticket.ticketNumber}</span>
            <Badge variant="outline">{TICKET_TYPE_LABELS[ticket.type as TicketType]}</Badge>
            <Badge variant="secondary">{TICKET_QA_STATUS_LABELS[ticket.status as TicketQAStatus]}</Badge>
            {ticket.hasUnreadUpdates && (
              <Badge variant="destructive" className="text-xs">Hay novedades del desarrollador</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
            <p className="text-sm">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Módulo</p>
              <p className="text-sm">{ticket.module}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Prioridad</p>
              <PriorityBadge priority={ticket.priority} />
            </div>
          </div>

          {ticket.externalWorkItem && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Trámite</p>
              <p className="text-sm font-mono">{ticket.externalWorkItem.type} {ticket.externalWorkItem.externalId}</p>
            </div>
          )}

          {ticket.observations && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Observaciones</p>
              <p className="text-sm text-muted-foreground">{ticket.observations}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Responsable</p>
            {ticket.assignedTo ? (
              <div className="flex items-center gap-2">
                <UserAvatar username={ticket.assignedTo.username} size="sm" />
                <span className="text-sm">{ticket.assignedTo.name || ticket.assignedTo.username}</span>
              </div>
            ) : ticket.status === TicketQAStatus.NEW ? (
              <div className="flex items-center gap-2">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Seleccionar responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedUserId || isPending}
                  size="sm"
                >
                  {isPending ? 'Asignando...' : 'Asignar'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin asignar</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
