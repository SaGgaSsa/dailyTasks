import { cn } from '@/lib/utils'
import { GanttIncidence } from '@/types'
import { computeGanttDates, getBarPosition, isDelayed } from '@/lib/gantt-utils'
import { getBarColorClasses } from './gantt-status-colors'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  const assigneeNames = incidence.assignments.map((a) => a.user.name || a.user.username)

  const isBefore = endDate < weekStart
  const isAfter = startDate > weekEnd

  return (
    <div className="flex items-center h-8 group">
      {/* Left column - info */}
      <div className="w-[280px] shrink-0 flex items-center gap-2 px-3 sticky left-0 z-20 bg-background">
        <span className="text-xs truncate flex-1" title={incidence.description}>
          {incidence.description}
        </span>
        {assigneeNames.length > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0 max-w-[60px] truncate">
            {assigneeNames.length === 1
              ? assigneeNames[0]
              : assigneeNames.map((n) => n.charAt(0).toUpperCase()).join('')}
          </span>
        )}
      </div>

      {/* Timeline area */}
      <div className="flex-1 relative min-w-[600px] h-full">
        {/* Day grid lines */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={cn('flex-1', i < 4 && 'border-r border-border/30')} />
          ))}
        </div>

        {position ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'absolute top-1 h-6 rounded-md transition-opacity',
                  getBarColorClasses(incidence.status, delayed),
                  isEstimated && 'border-r-2 border-dashed border-foreground/20'
                )}
                style={{
                  left: `${position.leftPercent}%`,
                  width: `${position.widthPercent}%`,
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="flex flex-col gap-1">
                <p className="font-medium">{incidence.description}</p>
                <p>{STATUS_LABELS[incidence.status] ?? incidence.status}</p>
                <p>
                  {formatDate(startDate)} → {formatDate(endDate)}
                  {isEstimated && ' (estimado)'}
                </p>
                {assigneeNames.length > 0 && <p>{assigneeNames.join(', ')}</p>}
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
