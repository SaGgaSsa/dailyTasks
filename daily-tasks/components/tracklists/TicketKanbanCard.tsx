'use client'

import { TicketQAWithDetails } from '@/types'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketActionsMenu } from './TicketActionsMenu'
import { AlertTriangle, Cloud, FileCode2, Server } from 'lucide-react'
import { formatPlanningWarnings } from '@/lib/planning-warning-labels'

interface Props {
  ticket: TicketQAWithDetails
  assignableUsers: AssignableUser[]
  readOnly?: boolean
}

export function TicketKanbanCard({ ticket, assignableUsers, readOnly = false }: Props) {
  const planningWarnings = ticket.incidenceGantt?.planningWarnings ?? []

  return (
    <div className="bg-card border border-border rounded-lg p-3 space-y-2 relative">
      {ticket.hasUnreadUpdates && (
        <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-red-500" />
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {ticket.externalWorkItem ? (
              <IncidenceBadge type={ticket.externalWorkItem.type} color={ticket.externalWorkItem.color} externalId={ticket.externalWorkItem.externalId} />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {ticket.hasScripts && (
              <FileCode2 className="h-3.5 w-3.5 text-amber-500" aria-label="Tiene scripts" />
            )}
            {planningWarnings.length > 0 && (
              <AlertTriangle
                className="h-3.5 w-3.5 text-amber-500"
                aria-label={formatPlanningWarnings(planningWarnings)}
              />
            )}
          </div>
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
        <div className="flex min-w-0 flex-1 justify-end gap-1">
          {ticket.referenceEnvironment ? (
            <Badge variant="outline" className="h-6 gap-1 px-1.5 text-[10px] font-normal">
              <Server className="h-3 w-3" />
              <span className="truncate">{ticket.referenceEnvironment.name}</span>
            </Badge>
          ) : null}
          {ticket.deploymentSummary.isCurrentlyDeployed ? (
            <Badge variant="outline" className="h-6 gap-1 border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[10px] font-normal text-emerald-600 dark:text-emerald-300">
              <Cloud className="h-3 w-3" />
              <span>Deployado</span>
            </Badge>
          ) : null}
        </div>
        {ticket.assignedTo && (
          <UserAvatar username={ticket.assignedTo.username} size="sm" />
        )}
      </div>
    </div>
  )
}
