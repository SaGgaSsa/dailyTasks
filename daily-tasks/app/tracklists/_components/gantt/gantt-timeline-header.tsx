import { cn } from '@/lib/utils'
import { getTodayPosition } from '@/lib/gantt-utils'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

interface Props {
  weekDays: Date[]
  weekStart: Date
  weekEnd: Date
}

export function GanttTimelineHeader({ weekDays, weekStart, weekEnd }: Props) {
  const todayPos = getTodayPosition(weekStart, weekEnd)
  const now = new Date()
  const todayIndex = weekDays.findIndex(
    (d) => d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  )

  return (
    <div className="relative flex h-8 border-b border-border/50">
      {weekDays.map((d, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 flex items-center justify-center text-xs font-medium text-muted-foreground',
            i < 4 && 'border-r border-border/50',
            i === todayIndex && 'bg-blue-500/5'
          )}
        >
          {DAY_NAMES[i]} {d.getDate()}
        </div>
      ))}
      {todayPos !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-400/60 z-10"
          style={{ left: `${todayPos}%` }}
        />
      )}
    </div>
  )
}
