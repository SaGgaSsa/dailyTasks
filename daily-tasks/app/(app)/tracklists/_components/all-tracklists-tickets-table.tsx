'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Cloud, Inbox, Server, User, MoreVertical, Eye, BarChart3, Ban, Layers, FileCode2 } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { UserAvatar } from '@/components/ui/user-avatar'
import { IncidenceBadge } from '@/components/ui/incidence-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { TICKET_TYPE_LABELS, TicketType, TICKET_QA_STATUS_LABELS, TicketQAStatus } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { DismissTicketDialog } from '@/components/tracklists/DismissTicketDialog'
import { CreateTicketDialog } from '@/components/tracklists/create-ticket-dialog'
import { completeTicket, uncompleteTicket } from '@/app/actions/tracklists'
import { formatPlanningWarnings } from '@/lib/planning-warning-labels'
import { toast } from 'sonner'

interface Props {
  tickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
}

function getTicketTypeLabel(type: string): string {
  return TICKET_TYPE_LABELS[type as TicketType] || type
}

function getTicketStatusLabel(status: string): string {
  return TICKET_QA_STATUS_LABELS[status as keyof typeof TICKET_QA_STATUS_LABELS] || status
}

export function AllTracklistsTicketsTable({ tickets, assignableUsers }: Props) {
  const router = useRouter()
  const [dismissTarget, setDismissTarget] = useState<{ ticketId: number; tracklistId: number } | null>(null)
  const [openTicketId, setOpenTicketId] = useState<number | null>(null)
  const [completing, setCompleting] = useState<number | null>(null)

  const openTicket = openTicketId !== null ? tickets.find((t) => t.id === openTicketId) ?? null : null

  const handleComplete = async (ticket: TicketQAWithDetails) => {
    if (ticket.status !== TicketQAStatus.TEST) return
    setCompleting(ticket.id)
    try {
      const result = await completeTicket(ticket.id, ticket.tracklistId)
      if (result.success) {
        toast.success('Ticket completado')
      } else {
        toast.error(result.error || 'Error al completar')
      }
    } finally {
      setCompleting(null)
    }
  }

  const handleUncomplete = async (ticket: TicketQAWithDetails) => {
    if (ticket.status !== TicketQAStatus.COMPLETED) return
    setCompleting(ticket.id)
    try {
      const result = await uncompleteTicket(ticket.id, ticket.tracklistId)
      if (result.success) {
        toast.success('Ticket vuelto a Test')
      } else {
        toast.error(result.error || 'Error al descompletar')
      }
    } finally {
      setCompleting(null)
    }
  }

  const handleOpenScripts = (ticket: TicketQAWithDetails) => {
    if (!ticket.incidenceId) return
    router.push(`/incidences/${ticket.incidenceId}#scripts`)
  }

  return (
    <div className="border border-border rounded-2xl bg-card shadow-inner flex flex-col overflow-hidden min-w-0">
      {/* Header sticky */}
      <div className="flex-shrink-0">
        <Table className="table-fixed w-full">
          <TableHeader className="sticky top-0 z-10 border-b-2 border-border bg-card">
            <TableRow>
              <TableHead className="w-8 px-2 bg-card" />
              <TableHead className="w-12 px-2 bg-card text-center">#</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Tipo</TableHead>
              <TableHead className="w-20 px-2 bg-card">Módulo</TableHead>
              <TableHead className="w-auto px-2 bg-card">Descripción</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Prioridad</TableHead>
              <TableHead className="w-24 px-2 bg-card text-center">Estado</TableHead>
              <TableHead className="w-20 px-2 bg-card text-center">
                <div className="flex justify-center"><User className="h-4 w-4" /></div>
              </TableHead>
              <TableHead className="w-28 px-2 bg-card text-center">Trámite</TableHead>
              <TableHead className="w-10 px-0 bg-card text-center" />
            </TableRow>
          </TableHeader>
        </Table>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 max-h-96">
        <Table className="table-fixed w-full">
          <TableBody className="divide-y divide-border">
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-4 rounded-full bg-muted/50">
                      <Inbox className="h-6 w-6 text-muted-foreground/60" />
                    </div>
                    <p className="text-muted-foreground text-sm">No hay tickets</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => {
                const isTest = ticket.status === TicketQAStatus.TEST
                const isCompleted = ticket.status === TicketQAStatus.COMPLETED
                const planningWarnings = ticket.incidenceGantt?.planningWarnings ?? []
                return (
                  <TableRow key={ticket.id} className="hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setOpenTicketId(ticket.id)}>
                    <TableCell className="w-8 px-2 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={isCompleted}
                        disabled={(!isTest && !isCompleted) || completing === ticket.id}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() => isCompleted ? handleUncomplete(ticket) : handleComplete(ticket)}
                        aria-label="Completar ticket"
                      />
                    </TableCell>
                    <TableCell className="w-12 font-mono text-xs px-2 py-3 text-center">
                      <div className="relative inline-flex items-center justify-center gap-1">
                        {ticket.ticketNumber}
                        {ticket.hasScripts && (
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
                      {(ticket.referenceEnvironment || ticket.deploymentSummary.isCurrentlyDeployed || planningWarnings.length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {planningWarnings.length > 0 ? (
                            <Badge
                              variant="outline"
                              className="h-5 gap-1 border-amber-500/20 bg-amber-500/10 px-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-300"
                              title={formatPlanningWarnings(planningWarnings)}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Plan
                            </Badge>
                          ) : null}
                          {ticket.referenceEnvironment ? (
                            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                              <Server className="h-3 w-3" />
                              {ticket.referenceEnvironment.name}
                            </Badge>
                          ) : null}
                          {ticket.deploymentSummary.isCurrentlyDeployed ? (
                            <Badge variant="outline" className="h-5 gap-1 border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[10px] font-normal text-emerald-600 dark:text-emerald-300">
                              <Cloud className="h-3 w-3" />
                              Deployado
                            </Badge>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-24 px-2 py-3 text-center">
                      <PriorityBadge priority={ticket.priority} className="text-xs" />
                    </TableCell>
                    <TableCell className="w-24 px-2 py-3 text-center">
                      {getTicketStatusLabel(ticket.status)}
                    </TableCell>
                    <TableCell className="w-20 px-2 py-3 text-center">
                      {ticket.assignedTo ? (
                        <UserAvatar username={ticket.assignedTo.username} size="sm" className="mx-auto" />
                      ) : '-'}
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
                          {ticket.incidenceId && (
                            <DropdownMenuItem onClick={() => router.push(`/incidences/${ticket.incidenceId}`)}>
                              <Layers className="mr-2 h-4 w-4" />
                              Ver Incidencia
                            </DropdownMenuItem>
                          )}
                          {ticket.incidenceId && (
                            <DropdownMenuItem onClick={() => handleOpenScripts(ticket)}>
                              <FileCode2 className="mr-2 h-4 w-4" />
                              Ver scripts
                            </DropdownMenuItem>
                          )}
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
                )
              })
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
        <CreateTicketDialog
          open={openTicketId !== null}
          onOpenChange={(open) => { if (!open) setOpenTicketId(null) }}
          tracklistId={openTicket.tracklistId}
          assignableUsers={assignableUsers}
          viewMode={openTicket}
        />
      )}
    </div>
  )
}
