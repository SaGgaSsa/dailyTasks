'use client'

import { Inbox, User } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { UserAvatar } from '@/components/ui/user-avatar'

interface TicketsGridProps {
  initialTickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
}

export function TicketsGrid({ initialTickets, assignableUsers }: TicketsGridProps) {

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12 px-2">#</TableHead>
          <TableHead className="w-24 px-2">Tipo</TableHead>
          <TableHead className="w-20 px-2">Módulo</TableHead>
          <TableHead className="px-2">Descripción</TableHead>
          <TableHead className="w-24 px-2">Prioridad</TableHead>
          <TableHead className="w-20 px-2"><User className="h-4 w-4" /></TableHead>
          <TableHead className="w-28 px-2">Trámite</TableHead>
          <TableHead className="w-24 px-2">Estado Dev</TableHead>
          <TableHead className="w-24 px-2">Estado QA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initialTickets.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="p-12 text-center">
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
            <TableRow key={ticket.id}>
              <TableCell className="font-mono text-xs px-2 py-2">{ticket.ticketNumber}</TableCell>
              <TableCell className="px-2 py-2">{ticket.type}</TableCell>
              <TableCell className="px-2 py-2">{ticket.module}</TableCell>
              <TableCell className="max-w-xs truncate px-2 py-2" title={ticket.description}>
                {ticket.description}
              </TableCell>
              <TableCell className="px-2 py-2">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                    ticket.priority === 'Bloqueante' && 'bg-red-500/20 text-red-400',
                    ticket.priority === 'Alta' && 'bg-orange-500/20 text-orange-400',
                    ticket.priority === 'Media' && 'bg-yellow-500/20 text-yellow-400',
                    ticket.priority === 'Baja' && 'bg-green-500/20 text-green-400'
                  )}
                >
                  {ticket.priority}
                </span>
              </TableCell>
              <TableCell className="px-2 py-2">
                {ticket.assignedTo ? (
                  <UserAvatar username={ticket.assignedTo.username} size="sm" className="mx-auto" />
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="font-mono text-xs px-2 py-2">{ticket.tramite || '-'}</TableCell>
              <TableCell className="px-2 py-2">{ticket.status}</TableCell>
              <TableCell className="px-2 py-2">{ticket.verificationStatus}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
