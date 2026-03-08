'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EllipsisVertical, Eye, BarChart3, Ban, ExternalLink } from 'lucide-react'
import { TicketQAWithDetails } from '@/types'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { DismissTicketDialog } from './DismissTicketDialog'
import { TicketDetailModal } from './TicketDetailModal'
import { AssignableUser } from '@/app/actions/user-actions'

interface Props {
  ticket: TicketQAWithDetails
  assignableUsers: AssignableUser[]
}

export function TicketKanbanCard({ ticket, assignableUsers }: Props) {
  const router = useRouter()
  const [dismissOpen, setDismissOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <EllipsisVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={() => setDetailOpen(true)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver ticket
              </DropdownMenuItem>
              {ticket.incidenceId && (
                <DropdownMenuItem onClick={() => router.push(`/dashboard/incidences/${ticket.incidenceId}`)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Incidencia
                </DropdownMenuItem>
              )}
              <DropdownMenuItem disabled>
                <BarChart3 className="mr-2 h-4 w-4" />
                Ver Métricas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setDismissOpen(true)}
              >
                <Ban className="mr-2 h-4 w-4" />
                Desestimar ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      <DismissTicketDialog
        open={dismissOpen}
        onOpenChange={setDismissOpen}
        ticketId={ticket.id}
        tracklistId={ticket.tracklistId}
      />

      <TicketDetailModal
        ticket={ticket}
        tracklistId={ticket.tracklistId}
        assignableUsers={assignableUsers}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}
