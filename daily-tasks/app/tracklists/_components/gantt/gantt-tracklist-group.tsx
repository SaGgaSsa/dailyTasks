import { cn } from '@/lib/utils'
import { GanttTracklist } from '@/types'
import { GanttRow } from './gantt-row'
import { getBarPosition, isBusinessDay } from '@/lib/gantt-utils'

interface Props {
  tracklist: GanttTracklist
  weekStart: Date
  weekEnd: Date
  weekDays: Date[]
  nonWorkingDays: Date[]
}

export function GanttTracklistGroup({ tracklist, weekStart, weekEnd, weekDays, nonWorkingDays }: Props) {
  const dueDateEnd = tracklist.dueDate ? new Date(tracklist.dueDate) : null
  if (dueDateEnd) dueDateEnd.setHours(23, 59, 59, 999)
  const dueDatePosition = dueDateEnd
    ? getBarPosition(dueDateEnd, dueDateEnd, weekStart, weekEnd)
    : null

  const isDuePast = tracklist.dueDate ? tracklist.dueDate < new Date() : false

  return (
    <div className="flex flex-col relative">
      {/* Due date line spanning all rows */}
      {dueDatePosition && (
        <div
          className={cn(
            'absolute top-0 bottom-0 border-l-2 border-dashed z-10 pointer-events-none',
            isDuePast ? 'border-red-500/60' : 'border-orange-400/60'
          )}
          style={{ left: `calc(280px + (100% - 280px) * ${dueDatePosition.leftPercent / 100})` }}
        />
      )}

      {/* Tracklist header */}
      <div className="flex items-center h-9 border-t border-b border-border bg-muted/50">
        <div className="w-[280px] shrink-0 px-3 sticky left-0 z-20">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold truncate leading-none">{tracklist.title}</span>
            {tracklist.dueDate && (
              <span className={cn(
                'text-[10px] shrink-0 leading-none ml-auto',
                isDuePast ? 'text-red-400' : 'text-muted-foreground'
              )}>
                {tracklist.dueDate.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 relative min-w-[600px] h-full">
          {/* Day grid lines */}
          <div className="absolute inset-0 flex">
            {weekDays.map((d, i) => (
              <div key={i} className={cn(
                'flex-1',
                i < 4 && 'border-r-2 border-border/60',
                !isBusinessDay(d, nonWorkingDays) && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,var(--color-muted)_4px,var(--color-muted)_8px)]'
              )} />
            ))}
          </div>
        </div>
      </div>

      {/* Incidence rows */}
      {tracklist.incidences.length === 0 ? (
        <div className="flex items-center h-10">
          <div className="w-[280px] shrink-0 px-3 sticky left-0 z-20 bg-background">
            <span className="text-xs text-muted-foreground italic">Sin incidencias activas</span>
          </div>
        </div>
      ) : (
        tracklist.incidences.map((inc) => (
          <GanttRow
            key={inc.id}
            incidence={inc}
            weekStart={weekStart}
            weekEnd={weekEnd}
            weekDays={weekDays}
            nonWorkingDays={nonWorkingDays}
          />
        ))
      )}
    </div>
  )
}
