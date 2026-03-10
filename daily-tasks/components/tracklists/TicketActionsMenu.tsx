'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, RotateCcw, Eye, BarChart3, Ban, Layers, Pencil, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { TicketQAWithDetails } from '@/types'
import { AssignableUser } from '@/app/actions/user-actions'
import { TicketQAStatus } from '@/types/enums'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { completeTicket, uncompleteTicket } from '@/app/actions/tracklists'
import { DismissTicketDialog } from './DismissTicketDialog'
import { CreateTicketDialog } from './create-ticket-dialog'

interface TicketActionsMenuProps {
  ticket: TicketQAWithDetails
  assignableUsers: AssignableUser[]
  readOnly?: boolean
  onOpenTicket?: (ticket: TicketQAWithDetails) => void
  triggerSize?: 'sm' | 'default'
}

export function TicketActionsMenu({
  ticket,
  assignableUsers,
  readOnly = false,
  onOpenTicket,
  triggerSize = 'default',
}: TicketActionsMenuProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dismissOpen, setDismissOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<TicketQAWithDetails | null>(null)
  const [dialogTarget, setDialogTarget] = useState<TicketQAWithDetails | null>(null)

  const handleOpenTicket = (t: TicketQAWithDetails) => {
    if (onOpenTicket) {
      onOpenTicket(t)
    } else {
      setDialogTarget(t)
    }
  }

  const handleCompleteTicket = async () => {
    setMenuOpen(false)
    const result = await completeTicket(ticket.id, ticket.tracklistId)
    if (result.success) {
      toast.success('Ticket completado')
    } else {
      toast.error(result.error || 'Error al completar el ticket')
    }
  }

  const handleUncompleteTicket = async () => {
    setMenuOpen(false)
    const result = await uncompleteTicket(ticket.id, ticket.tracklistId)
    if (result.success) {
      toast.success('Ticket vuelto a Test')
    } else {
      toast.error(result.error || 'Error al volver el ticket a Test')
    }
  }

  const buttonClass = triggerSize === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const iconClass = triggerSize === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`${buttonClass} p-0`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Abrir menú</span>
            <MoreVertical className={iconClass} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]" onClick={(e) => e.stopPropagation()}>
          {!readOnly && ticket.status === TicketQAStatus.TEST && (
            <DropdownMenuItem
              className="text-green-500 focus:text-green-500"
              onClick={handleCompleteTicket}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Completar ticket
            </DropdownMenuItem>
          )}
          {!readOnly && ticket.status === TicketQAStatus.TEST && (
            <DropdownMenuItem
              className="text-orange-500 focus:text-orange-500"
              onClick={() => { setMenuOpen(false); setRejectTarget(ticket) }}
            >
              <XCircle className="mr-2 h-4 w-4 text-orange-500" />
              Rechazar ticket
            </DropdownMenuItem>
          )}
          {!readOnly && ticket.status === TicketQAStatus.COMPLETED && (
            <DropdownMenuItem onClick={handleUncompleteTicket}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Volver a Test
            </DropdownMenuItem>
          )}
          {ticket.status === TicketQAStatus.NEW && !readOnly ? (
            <DropdownMenuItem onClick={() => { setMenuOpen(false); handleOpenTicket(ticket) }}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar ticket
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => { setMenuOpen(false); handleOpenTicket(ticket) }}>
              <Eye className="mr-2 h-4 w-4" />
              Ver ticket
            </DropdownMenuItem>
          )}
          {ticket.incidenceId && (
            <DropdownMenuItem onClick={() => { setMenuOpen(false); router.push(`/dashboard/incidences/${ticket.incidenceId}`) }}>
              <Layers className="mr-2 h-4 w-4" />
              Ver Incidencia
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <BarChart3 className="mr-2 h-4 w-4" />
            Ver Métricas
          </DropdownMenuItem>
          {!readOnly && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => { setMenuOpen(false); setDismissOpen(true) }}
              >
                <Ban className="mr-2 h-4 w-4" />
                Desestimar ticket
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DismissTicketDialog
        open={dismissOpen}
        onOpenChange={setDismissOpen}
        ticketId={ticket.id}
        tracklistId={ticket.tracklistId}
      />

      {rejectTarget && (
        <CreateTicketDialog
          open={!!rejectTarget}
          onOpenChange={(open) => { if (!open) setRejectTarget(null) }}
          tracklistId={rejectTarget.tracklistId}
          assignableUsers={assignableUsers}
          rejectMode={rejectTarget}
        />
      )}

      {dialogTarget && (
        <CreateTicketDialog
          open={!!dialogTarget}
          onOpenChange={(open) => { if (!open) setDialogTarget(null) }}
          tracklistId={dialogTarget.tracklistId}
          assignableUsers={assignableUsers}
          {...(dialogTarget.status === TicketQAStatus.NEW && !readOnly
            ? { editMode: dialogTarget }
            : { viewMode: dialogTarget })}
        />
      )}
    </>
  )
}
