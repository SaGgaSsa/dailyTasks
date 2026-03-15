import type { GanttTracklist } from '@/types'

const HOURS_PER_DAY = 8

export interface GanttBarDates {
  startDate: Date
  endDate: Date
  isEstimated: boolean
}

interface ComputeGanttDatesParams {
  startedAt: Date | null
  completedAt: Date | null
  estimatedTime: number | null
  ticketCreatedAt: Date
  nonWorkingDays?: Date[]
}

// --- Business day helpers ---

export function isBusinessDay(date: Date, nonWorkingDays: Date[] = []): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false
  return !nonWorkingDays.some(
    (nwd) => {
      const d = nwd instanceof Date ? nwd : new Date(nwd)
      return (
        d.getUTCFullYear() === date.getFullYear() &&
        d.getUTCMonth() === date.getMonth() &&
        d.getUTCDate() === date.getDate()
      )
    }
  )
}

export function addBusinessDays(start: Date, days: number, nonWorkingDays: Date[] = []): Date {
  const result = new Date(start)
  let remaining = days
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    if (isBusinessDay(result, nonWorkingDays)) {
      remaining--
    }
  }
  return result
}

export function computeGanttDates({
  startedAt,
  completedAt,
  estimatedTime,
  ticketCreatedAt,
  nonWorkingDays = [],
}: ComputeGanttDatesParams): GanttBarDates {
  const startDate = startedAt ?? ticketCreatedAt

  if (completedAt) {
    return { startDate, endDate: completedAt, isEstimated: false }
  }

  const hours = estimatedTime ?? HOURS_PER_DAY
  const days = Math.ceil(hours / HOURS_PER_DAY)
  const endDate = days <= 1
    ? new Date(startDate)
    : addBusinessDays(startDate, days - 1, nonWorkingDays)
  endDate.setHours(23, 59, 59, 999)

  return { startDate, endDate, isEstimated: true }
}

// --- Week helpers ---

export function getWeekRange(ref: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(ref)
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const weekStart = new Date(d)
  weekStart.setDate(d.getDate() + diffToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4)
  weekEnd.setHours(23, 59, 59, 999)

  return { weekStart, weekEnd }
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

export interface BarPosition {
  leftPercent: number
  widthPercent: number
}

function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

export function getBarPosition(
  barStart: Date,
  barEnd: Date,
  weekStart: Date,
  weekEnd: Date
): BarPosition | null {
  const normalizedStart = startOfDay(barStart)
  const normalizedEnd = endOfDay(barEnd)

  if (normalizedEnd < weekStart || normalizedStart > weekEnd) return null

  const totalMs = weekEnd.getTime() - weekStart.getTime()
  const clampedStart = normalizedStart < weekStart ? weekStart : normalizedStart
  const clampedEnd = normalizedEnd > weekEnd ? weekEnd : normalizedEnd

  const leftPercent = ((clampedStart.getTime() - weekStart.getTime()) / totalMs) * 100
  const widthPercent = Math.max(
    2,
    ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100
  )

  return { leftPercent, widthPercent }
}

// --- Bar segments (non-working day gaps) ---

export interface BarSegment {
  leftPercent: number
  widthPercent: number
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Splits a bar into segments that skip non-working days.
 * Each day slot = 20% width (5 equal flex-1 columns).
 *
 * If `isEstimated` is false and `barEnd` falls on a non-working day,
 * that day is still rendered (respects actual completedAt).
 */
export function getBarSegments(
  barStart: Date,
  barEnd: Date,
  weekDays: Date[],
  nonWorkingDays: Date[],
  isEstimated: boolean,
): BarSegment[] {
  const slotWidth = 100 / weekDays.length // 20% per day
  const normalizedStart = startOfDay(barStart)
  const normalizedEnd = endOfDay(barEnd)

  // Determine which day slots the bar covers and are renderable
  const renderableIndices: number[] = []
  for (let i = 0; i < weekDays.length; i++) {
    const dayStart = startOfDay(weekDays[i])
    const dayEnd = endOfDay(weekDays[i])

    // Does the bar overlap this day?
    if (normalizedEnd < dayStart || normalizedStart > dayEnd) continue

    const isNonWorking = !isBusinessDay(weekDays[i], nonWorkingDays)

    // If non-working: skip, unless it's a completed bar ending on this day
    if (isNonWorking) {
      if (!isEstimated && isSameDate(barEnd, weekDays[i])) {
        renderableIndices.push(i)
      }
      continue
    }

    renderableIndices.push(i)
  }

  if (renderableIndices.length === 0) return []

  // Group consecutive indices into segments
  const segments: BarSegment[] = []
  let segStart = renderableIndices[0]
  let segEnd = renderableIndices[0]

  for (let j = 1; j < renderableIndices.length; j++) {
    if (renderableIndices[j] === segEnd + 1) {
      segEnd = renderableIndices[j]
    } else {
      segments.push({
        leftPercent: segStart * slotWidth,
        widthPercent: (segEnd - segStart + 1) * slotWidth,
      })
      segStart = renderableIndices[j]
      segEnd = renderableIndices[j]
    }
  }
  segments.push({
    leftPercent: segStart * slotWidth,
    widthPercent: (segEnd - segStart + 1) * slotWidth,
  })

  return segments
}

export function getTodayPosition(weekStart: Date, weekEnd: Date): number | null {
  const now = new Date()
  if (now < weekStart || now > weekEnd) return null
  const totalMs = weekEnd.getTime() - weekStart.getTime()
  return ((now.getTime() - weekStart.getTime()) / totalMs) * 100
}

export function isDelayed(endDate: Date, status: string, isEstimated: boolean): boolean {
  if (!isEstimated) return false
  if (status === 'DONE' || status === 'REVIEW') return false
  return new Date() > endDate
}

// --- Date bounds ---

export function getGanttDateBounds(tracklists: GanttTracklist[], nonWorkingDays: Date[] = []): { earliest: Date | null; latest: Date | null } {
  let earliest: Date | null = null
  let latest: Date | null = null

  for (const tl of tracklists) {
    if (tl.dueDate && (latest === null || tl.dueDate > latest)) {
      latest = tl.dueDate
    }

    for (const inc of tl.incidences) {
      const startDate = inc.startedAt ?? inc.ticket?.createdAt ?? inc.createdAt
      if (earliest === null || startDate < earliest) {
        earliest = startDate
      }

      const { endDate } = computeGanttDates({
        startedAt: inc.startedAt,
        completedAt: inc.completedAt,
        estimatedTime: inc.estimatedTime,
        ticketCreatedAt: inc.ticket?.createdAt ?? inc.createdAt,
        nonWorkingDays,
      })
      if (latest === null || endDate > latest) {
        latest = endDate
      }
    }
  }

  return { earliest, latest }
}
