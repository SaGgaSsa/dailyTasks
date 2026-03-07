'use client'

import { useState } from 'react'
import { Inbox, User, MoreVertical, Eye, BarChart3, Ban } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { UserAvatar } from '@/components/ui/user-avatar'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { TICKET_TYPE_LABELS, TicketType, TICKET_QA_STATUS_LABELS } from '@/types/enums'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { DismissTicketDialog } from './DismissTicketDialog'
import { TicketDetailModal } from './TicketDetailModal'

interface TicketsGridProps {
  initialTickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
}

function getTicketTypeLabel(type: string): string {
  return TICKET_TYPE_LABELS[type as TicketType] || type
}

function getTicketStatusLabel(status: keyof typeof TICKET_QA_STATUS_LABELS | string): string {
  return TICKET_QA_STATUS_LABELS[status as keyof typeof TICKET_QA_STATUS_LABELS] || status
}

export function TicketsGrid({ initialTickets, assignableUsers }: TicketsGridProps) {
  const [dismissTarget, setDismissTarget] = useState<{ ticketId: number; tracklistId: number } | null>(null)
  const [openTicketId, setOpenTicketId] = useState<number | null>(null)

  const openTicket = openTicketId !== null ? initialTickets.find((t) => t.id === openTicketId) ?? null : null

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
                >
                  <TableCell className="w-12 font-mono text-xs px-2 py-3 text-center">
                    <div className="relative inline-flex items-center justify-center">
                      {ticket.ticketNumber}
                      {ticket.hasUnreadUpdates && (
                        <span className="absolute -top-1 -right-2 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">{getTicketTypeLabel(ticket.type)}</TableCell>
                  <TableCell className="w-20 px-2 py-3">{ticket.module}</TableCell>
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
                    {ticket.incidence ? (
                      <IncidenceBadge 
                        type={ticket.incidence.type} 
                        externalId={ticket.incidence.externalId}
                        className="text-[10px] font-mono"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="w-10 px-0 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Abrir menú</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setOpenTicketId(ticket.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver ticket
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Ver Métricas
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDismissTarget({ ticketId: ticket.id, tracklistId: ticket.tracklistId })}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Desestimar ticket
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {dismissTarget && (
        <DismissTicketDialog
          open={!!dismissTarget}
          onOpenChange={(open) => { if (!open) setDismissTarget(null) }}
          ticketId={dismissTarget.ticketId}
          tracklistId={dismissTarget.tracklistId}
        />
      )}

      {openTicket && (
        <TicketDetailModal
          ticket={openTicket}
          tracklistId={openTicket.tracklistId}
          assignableUsers={assignableUsers}
          open={openTicketId !== null}
          onOpenChange={(open) => { if (!open) setOpenTicketId(null) }}
        />
      )}
    </div>
  )
}
