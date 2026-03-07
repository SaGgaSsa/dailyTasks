import { TicketQAWithDetails } from '@/types'
import { TicketQAStatus, TICKET_QA_STATUS_LABELS } from '@/types/enums'
import { TicketKanbanCard } from './TicketKanbanCard'
import { AssignableUser } from '@/app/actions/user-actions'

const COLUMNS = [
  { id: TicketQAStatus.ASSIGNED, title: TICKET_QA_STATUS_LABELS[TicketQAStatus.ASSIGNED] },
  { id: TicketQAStatus.IN_DEVELOPMENT, title: TICKET_QA_STATUS_LABELS[TicketQAStatus.IN_DEVELOPMENT] },
  { id: TicketQAStatus.TEST, title: TICKET_QA_STATUS_LABELS[TicketQAStatus.TEST] },
]

interface Props {
  tickets: TicketQAWithDetails[]
  assignableUsers: AssignableUser[]
}

export function TicketKanbanBoard({ tickets, assignableUsers }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {COLUMNS.map((col) => {
        const colTickets = tickets.filter((t) => t.status === col.id)
        return (
          <div key={col.id} className="bg-muted/30 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium">{col.title}</span>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {colTickets.length}
              </span>
            </div>
            <div className="space-y-2">
              {colTickets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin tickets</p>
              ) : (
                colTickets.map((ticket) => (
                  <TicketKanbanCard key={ticket.id} ticket={ticket} assignableUsers={assignableUsers} />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
