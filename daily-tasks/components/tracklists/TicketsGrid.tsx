'use client'

import { useState } from 'react'
import { Inbox, User, FileCode2 } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { UserAvatar } from '@/components/ui/user-avatar'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { TICKET_TYPE_LABELS, TicketType, TICKET_QA_STATUS_LABELS, TicketQAStatus } from '@/types/enums'
import { TicketActionsMenu } from './TicketActionsMenu'
import { CreateTicketDialog } from './create-ticket-dialog'



interface TicketsGridProps {
  initialTickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
  readOnly?: boolean
}

function getTicketTypeLabel(type: string): string {
  return TICKET_TYPE_LABELS[type as TicketType] || type
}

function getTicketStatusLabel(status: keyof typeof TICKET_QA_STATUS_LABELS | string): string {
  return TICKET_QA_STATUS_LABELS[status as keyof typeof TICKET_QA_STATUS_LABELS] || status
}

export function TicketsGrid({ initialTickets, assignableUsers, readOnly = false }: TicketsGridProps) {
  const [viewTarget, setViewTarget] = useState<TicketQAWithDetails | null>(null)

  return (
    <div className="border border-border rounded-2xl bg-card shadow-inner flex flex-col h-full overflow-hidden min-w-0">
      {/* Header sticky */}
      <div className="flex-shrink-0">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 z-10 border-b-2 border-border bg-card">
            <TableRow>
              <TableHead className="w-12 px-2 bg-card text-center">#</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Tipo</TableHead>
              <TableHead className="w-20 px-2 bg-card">Módulo</TableHead>
              <TableHead className="w-auto px-2 bg-card">Descripción</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Prioridad</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Estado</TableHead>
              <TableHead className="w-20 px-2 bg-card text-center"><div className="flex justify-center"><User className="h-4 w-4" /></div></TableHead>
              <TableHead className="w-28 px-2 bg-card text-center">Trámite</TableHead>
              <TableHead className="w-10 px-0 bg-card text-center" />
            </TableRow>
          </TableHeader>
        </Table>
      </div>

      {/* Body con scroll */}
      <ScrollArea className="flex-1">
        <Table className="table-fixed w-full">
          <TableBody className="divide-y divide-border">
            {initialTickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-4 rounded-full bg-muted/50">
                      <Inbox className="h-8 w-8 text-muted-foreground/60" />
                    </div>
                    <p className="text-muted-foreground font-medium">No hay tickets</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              initialTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setViewTarget(ticket)}
                >
                  <TableCell className="w-12 font-mono text-xs px-2 py-3 text-center">
                    <div className="relative inline-flex items-center justify-center gap-1">
                      {ticket.ticketNumber}
                      {ticket.hasScriptsContent && (
                        <FileCode2 className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      {ticket.hasUnreadUpdates && (
                        <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">{getTicketTypeLabel(ticket.type)}</TableCell>
                  <TableCell className="w-20 px-2 py-3">{ticket.module.name}</TableCell>
                  <TableCell className="w-auto min-w-0 px-2 py-3">
                    <div className="flex-1 min-w-0 truncate" title={ticket.description}>
                      {ticket.description}
                    </div>
                  </TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">
                    <PriorityBadge priority={ticket.priority} className="text-xs" />
                  </TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">
                    {getTicketStatusLabel(ticket.status as string)}
                  </TableCell>
                  <TableCell className="w-20 px-2 py-3 text-center">
                    {ticket.assignedTo ? (
                      <UserAvatar username={ticket.assignedTo.username} size="sm" className="mx-auto" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="w-28 px-2 py-3 text-center">
                    {ticket.externalWorkItem ? (
                      <IncidenceBadge
                        type={ticket.externalWorkItem.type}
                        color={ticket.externalWorkItem.color}
                        externalId={ticket.externalWorkItem.externalId}
                        className="text-[10px] font-mono"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-10 px-0 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <TicketActionsMenu
                      ticket={ticket}
                      assignableUsers={assignableUsers}
                      readOnly={readOnly}
                      onOpenTicket={setViewTarget}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {viewTarget && (
        <CreateTicketDialog
          open={!!viewTarget}
          onOpenChange={(open) => { if (!open) setViewTarget(null) }}
          tracklistId={viewTarget.tracklistId}
          assignableUsers={assignableUsers}
          {...(viewTarget.status === TicketQAStatus.NEW && !readOnly
            ? { editMode: viewTarget }
            : { viewMode: viewTarget })}
        />
      )}
    </div>
  )
}
