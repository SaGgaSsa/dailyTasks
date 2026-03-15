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
}

// --- Business day helpers ---

export function isBusinessDay(date: Date, nonWorkingDays: Date[] = []): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false
  return !nonWorkingDays.some(
    (nwd) =>
      nwd.getFullYear() === date.getFullYear() &&
      nwd.getMonth() === date.getMonth() &&
      nwd.getDate() === date.getDate()
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
}: ComputeGanttDatesParams): GanttBarDates {
  const startDate = startedAt ?? ticketCreatedAt

  if (completedAt) {
    return { startDate, endDate: completedAt, isEstimated: false }
  }

  const hours = estimatedTime ?? HOURS_PER_DAY
  const days = Math.ceil(hours / HOURS_PER_DAY)
  const endDate = days <= 1
    ? new Date(startDate)
    : addBusinessDays(startDate, days - 1)
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

export function getBarPosition(
  barStart: Date,
  barEnd: Date,
  weekStart: Date,
  weekEnd: Date
): BarPosition | null {
  if (barEnd < weekStart || barStart > weekEnd) return null

  const totalMs = weekEnd.getTime() - weekStart.getTime()
  const clampedStart = barStart < weekStart ? weekStart : barStart
  const clampedEnd = barEnd > weekEnd ? weekEnd : barEnd

  const leftPercent = ((clampedStart.getTime() - weekStart.getTime()) / totalMs) * 100
  const widthPercent = Math.max(
    2,
    ((clampedEnd.getTime() - clampedStart.getTime()) / totalMs) * 100
  )

  return { leftPercent, widthPercent }
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
