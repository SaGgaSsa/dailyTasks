import { cn } from '@/lib/utils'
import { getTodayPosition, isBusinessDay, isSameDate, buildNonWorkingDaySet, NON_WORKING_DAY_BG } from '@/lib/gantt-utils'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

interface Props {
  weekDays: Date[]
  weekStart: Date
  weekEnd: Date
  nonWorkingDays: Date[]
}

export function GanttTimelineHeader({ weekDays, weekStart, weekEnd, nonWorkingDays }: Props) {
  const nwdSet = buildNonWorkingDaySet(nonWorkingDays)
  const todayPos = getTodayPosition(weekStart, weekEnd)
  const now = new Date()
  const todayIndex = weekDays.findIndex((d) => isSameDate(d, now))

  return (
    <div className="relative flex h-8 border-b border-border/50">
      {weekDays.map((d, i) => {
        const isNonWorking = !isBusinessDay(d, nwdSet)
        return (
          <div
            key={i}
            className={cn(
              'flex-1 flex items-center justify-center text-xs font-medium text-muted-foreground',
              i < 4 && 'border-r-2 border-border/60',
              i === todayIndex && 'bg-blue-500/5',
              isNonWorking && NON_WORKING_DAY_BG
            )}
          >
            <span className={cn(isNonWorking && 'line-through')}>
              {DAY_NAMES[i]} {d.getDate()}
            </span>
          </div>
        )
      })}
      {todayPos !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-400/60 z-10"
          style={{ left: `${todayPos}%` }}
        />
      )}
    </div>
  )
}
