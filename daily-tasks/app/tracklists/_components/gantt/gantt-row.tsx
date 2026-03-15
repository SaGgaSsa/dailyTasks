import { cn } from '@/lib/utils'
import { GanttIncidence } from '@/types'
import { computeGanttDates, getBarPosition, isDelayed } from '@/lib/gantt-utils'
import { getBarColorClasses } from './gantt-status-colors'
import { ChevronLeft, ChevronRight, CheckSquare, Square, User } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { UserAvatar } from '@/components/ui/user-avatar'

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Pendiente',
  IN_PROGRESS: 'En Progreso',
  REVIEW: 'En Revisión',
  DONE: 'Completado',
}

interface Props {
  incidence: GanttIncidence
  weekStart: Date
  weekEnd: Date
  nonWorkingDays: Date[]
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

export function GanttRow({ incidence, weekStart, weekEnd }: Props) {
  const { startDate, endDate, isEstimated } = computeGanttDates({
    startedAt: incidence.startedAt,
    completedAt: incidence.completedAt,
    estimatedTime: incidence.estimatedTime,
    ticketCreatedAt: incidence.ticket?.createdAt ?? incidence.createdAt,
  })

  const position = getBarPosition(startDate, endDate, weekStart, weekEnd)
  const delayed = isDelayed(endDate, incidence.status, isEstimated)

  const isBefore = endDate < weekStart
  const isAfter = startDate > weekEnd

  // Bar continuation arrows
  const continuesLeft = position && startDate < weekStart
  const continuesRight = position && endDate > weekEnd

  // Task counts
  const allTasks = incidence.assignments.flatMap((a) => a.tasks)
  const completedTasks = allTasks.filter((t) => t.isCompleted).length
  const totalTasks = allTasks.length

  // Tramite info
  const ewi = incidence.externalWorkItem
  const trámite = `${ewi.type} ${ewi.externalId}`

  return (
    <div className="flex items-center h-10 group">
      {/* Left column - info */}
      <div className="w-[280px] shrink-0 flex items-center gap-2 px-3 sticky left-0 z-20 bg-background">
        <span className="text-xs truncate flex-1" title={incidence.description}>
          {incidence.description}
        </span>
        {(() => {
          const count = incidence.assignments.length
          if (count === 0) return null
          if (count === 1) {
            return (
              <UserAvatar
                username={incidence.assignments[0].user.username}
                className="h-5 w-5 text-[8px] ml-auto shrink-0"
              />
            )
          }
          const usernames = incidence.assignments.map((a) => a.user.username).join(', ')
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <User className="h-5 w-5 text-muted-foreground ml-auto shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{usernames}</p>
              </TooltipContent>
            </Tooltip>
          )
        })()}
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative min-w-[600px] h-full">
        {/* Day grid lines */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={cn('flex-1', i < 4 && 'border-r-2 border-border/60')} />
          ))}
        </div>

        {position ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'absolute top-2 h-6 rounded-md transition-opacity overflow-hidden flex items-center px-1.5 gap-1.5',
                  getBarColorClasses(incidence.status, delayed),
                  isEstimated && 'border-r-2 border-dashed border-foreground/20'
                )}
                style={{
                  left: `${position.leftPercent}%`,
                  width: `${position.widthPercent}%`,
                }}
              >
                {/* Left arrow if continues before week */}
                {continuesLeft && (
                  <span className="text-[10px] opacity-70 shrink-0">←</span>
                )}

                {/* Bar content */}
                {position.widthPercent > 8 && (
                  <span className="text-[9px] font-medium truncate opacity-80">
                    {formatDate(endDate)}
                  </span>
                )}

                {totalTasks > 0 && position.widthPercent > 12 && (
                  <span className="text-[9px] flex items-center gap-0.5 opacity-80 shrink-0 ml-auto">
                    {completedTasks === totalTasks
                      ? <CheckSquare className="h-2.5 w-2.5" />
                      : <Square className="h-2.5 w-2.5" />}
                    {completedTasks}/{totalTasks}
                  </span>
                )}

                {/* Right arrow if continues after week */}
                {continuesRight && (
                  <span className="text-[10px] opacity-70 shrink-0 ml-auto">→</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{incidence.description}</p>
                <p className="text-muted-foreground">
                  {incidence.technology.name} — {trámite}
                </p>
                <p>{STATUS_LABELS[incidence.status] ?? incidence.status}</p>
                <p>
                  {formatDate(startDate)} → {formatDate(endDate)}
                  {isEstimated && ' (estimado)'}
                </p>
                {delayed && <p className="text-red-400 font-medium">Retrasado</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="absolute inset-0 flex items-center px-2">
            {isBefore && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ChevronLeft className="h-3 w-3" />
                <span>{formatDate(endDate)}</span>
              </div>
            )}
            {isAfter && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                <span>{formatDate(startDate)}</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
