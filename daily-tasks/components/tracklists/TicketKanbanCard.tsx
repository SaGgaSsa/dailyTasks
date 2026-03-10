'use client'

import { TicketQAWithDetails } from '@/types'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketActionsMenu } from './TicketActionsMenu'

interface Props {
  ticket: TicketQAWithDetails
  assignableUsers: AssignableUser[]
  readOnly?: boolean
}

export function TicketKanbanCard({ ticket, assignableUsers, readOnly = false }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2 relative">
      {ticket.hasUnreadUpdates && (
        <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-red-500" />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {ticket.externalWorkItem ? (
            <IncidenceBadge type={ticket.externalWorkItem.type} externalId={ticket.externalWorkItem.externalId} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <PriorityBadge priority={ticket.priority} />
          <TicketActionsMenu
            ticket={ticket}
            assignableUsers={assignableUsers}
            readOnly={readOnly}
            triggerSize="sm"
          />
        </div>
      </div>
      <p className="text-xs text-foreground line-clamp-2">{ticket.description}</p>
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-xs font-normal">
          {ticket.module.name}
        </Badge>
        {ticket.assignedTo && (
          <UserAvatar username={ticket.assignedTo.username} size="sm" />
        )}
      </div>
    </div>
  )
}
