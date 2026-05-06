'use client'

import { GanttTracklist } from '@/types'
import { getWeekRange, getWeekDays } from '@/lib/gantt-utils'
import { GanttTimelineHeader } from './gantt-timeline-header'
import { GanttTracklistGroup } from './gantt-tracklist-group'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { GanttChart as GanttIcon } from 'lucide-react'
import { STATUS_STYLES, DELAYED_CLASSES, DELAYED_LABEL } from './gantt-status-colors'
import { cn } from '@/lib/utils'

function GanttLegend() {
  return (
    <div className="shrink-0 px-4 py-2">
      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_STYLES).map(([status, style]) => (
          <Badge
            key={status}
            variant="outline"
            className={cn('rounded-md', style.badge)}
          >
            {style.label}
          </Badge>
        ))}
        <Badge
          variant="outline"
          className={cn('rounded-md', DELAYED_CLASSES)}
        >
          {DELAYED_LABEL}
        </Badge>
      </div>
    </div>
  )
}

interface Props {
  tracklists: GanttTracklist[]
  nonWorkingDays?: Date[]
  referenceDate?: Date
}

export function GanttChart({ tracklists, nonWorkingDays = [], referenceDate }: Props) {
  const { weekStart, weekEnd } = getWeekRange(referenceDate ?? new Date())
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
      <div className="flex flex-col h-full min-h-0">
        <ScrollArea className="flex-1 min-h-0">
          <div className="min-w-[880px]">
            {/* Header */}
            <div className="flex sticky top-0 z-30 bg-background border-b border-border/50">
              <div className="w-[280px] shrink-0 h-8 sticky left-0 z-30 bg-background border-r border-border/50" />
              <div className="flex-1 min-w-[600px]">
                <GanttTimelineHeader weekDays={weekDays} weekStart={weekStart} weekEnd={weekEnd} nonWorkingDays={nonWorkingDays} />
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
        <Separator />
        <GanttLegend />
      </div>
    </TooltipProvider>
  )
}
