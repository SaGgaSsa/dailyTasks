'use client'

import { Inbox, User } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
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
              <TableHead className="w-20 px-2 bg-card text-center"><div className="flex justify-center"><User className="h-4 w-4" /></div></TableHead>
              <TableHead className="w-28 px-2 bg-card text-center">Trámite</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Estado Dev</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Estado QA</TableHead>
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
                <TableRow 
                  key={ticket.id} 
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <TableCell className="w-12 font-mono text-xs px-2 py-3 text-center">{ticket.ticketNumber}</TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">{ticket.type}</TableCell>
                  <TableCell className="w-20 px-2 py-3">{ticket.module}</TableCell>
                  <TableCell className="w-auto min-w-0 px-2 py-3">
                    <div className="flex-1 min-w-0 truncate" title={ticket.description}>
                      {ticket.description}
                    </div>
                  </TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">
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
                  <TableCell className="w-20 px-2 py-3 text-center">
                    {ticket.assignedTo ? (
                      <UserAvatar username={ticket.assignedTo.username} size="sm" className="mx-auto" />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="w-28 font-mono text-xs px-2 py-3 text-center">{ticket.tramite || '-'}</TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">{ticket.status}</TableCell>
                  <TableCell className="w-24 px-2 py-3 text-center">{ticket.verificationStatus}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
