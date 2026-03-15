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
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + days)

  return { startDate, endDate, isEstimated: true }
}
