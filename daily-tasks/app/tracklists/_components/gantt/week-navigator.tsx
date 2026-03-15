'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WeekNavigatorProps {
  weekOffset: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  canGoPrev: boolean
  canGoNext: boolean
  weekStart: Date
}

export function WeekNavigator({
  weekOffset,
  onPrev,
  onNext,
  onToday,
  canGoPrev,
  canGoNext,
  weekStart,
}: WeekNavigatorProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground capitalize min-w-[120px]">
        {weekStart.toLocaleDateString('es', { month: 'long' })} {weekStart.getFullYear()}
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} disabled={!canGoPrev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-3 text-xs font-medium"
        disabled={weekOffset === 0}
        onClick={onToday}
      >
        hoy
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} disabled={!canGoNext}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
