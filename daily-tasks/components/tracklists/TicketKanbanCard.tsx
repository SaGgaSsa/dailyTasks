import { EllipsisVertical } from 'lucide-react'
import { TicketQAWithDetails } from '@/types'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface Props {
  ticket: TicketQAWithDetails
}

export function TicketKanbanCard({ ticket }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          {ticket.incidence ? (
            <IncidenceBadge type={ticket.incidence.type} externalId={ticket.incidence.externalId} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <PriorityBadge priority={ticket.priority} />
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <EllipsisVertical className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-foreground line-clamp-2">{ticket.description}</p>
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-xs font-normal">
          {ticket.module}
        </Badge>
        {ticket.assignedTo && (
          <UserAvatar username={ticket.assignedTo.username} size="sm" />
        )}
      </div>
    </div>
  )
}
