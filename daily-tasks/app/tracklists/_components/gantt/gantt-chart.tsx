'use client'

import { GanttTracklist } from '@/types'
import { getWeekRange, getWeekDays } from '@/lib/gantt-utils'
import { GanttTimelineHeader } from './gantt-timeline-header'
import { GanttTracklistGroup } from './gantt-tracklist-group'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { GanttChart as GanttIcon } from 'lucide-react'

interface Props {
  tracklists: GanttTracklist[]
  nonWorkingDays?: Date[]
}

export function GanttChart({ tracklists, nonWorkingDays = [] }: Props) {
  const { weekStart, weekEnd } = getWeekRange(new Date())
  const weekDays = getWeekDays(weekStart)

  if (tracklists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <GanttIcon className="h-10 w-10 opacity-30" />
        <p className="text-sm">No hay tracklists con incidencias</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <ScrollArea className="flex-1">
        <div className="min-w-[880px]">
          {/* Header */}
          <div className="flex sticky top-0 z-30 bg-background border-b border-border/50">
            <div className="w-[280px] shrink-0 h-8 sticky left-0 z-30 bg-background border-r border-border/50" />
            <div className="flex-1 min-w-[600px]">
              <GanttTimelineHeader weekDays={weekDays} weekStart={weekStart} weekEnd={weekEnd} />
            </div>
          </div>

          {/* Tracklist groups */}
          <div className="flex flex-col gap-2">
          {tracklists.map((tl) => (
            <GanttTracklistGroup
              key={tl.id}
              tracklist={tl}
              weekStart={weekStart}
              weekEnd={weekEnd}
              weekDays={weekDays}
              nonWorkingDays={nonWorkingDays}
            />
          ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </TooltipProvider>
  )
}
