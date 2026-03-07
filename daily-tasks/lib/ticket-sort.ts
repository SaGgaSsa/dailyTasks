import { Priority } from '@/types/enums'

const PRIORITY_ORDER = ['BLOQUEANTE', 'HIGH', 'MEDIUM', 'LOW']

export const PRIORITY_OPTIONS = [
  { value: Priority.BLOQUEANTE, label: 'Bloqueante' },
  { value: Priority.HIGH, label: 'Alta' },
  { value: Priority.MEDIUM, label: 'Media' },
  { value: Priority.LOW, label: 'Baja' },
]

function indexOfCaseInsensitive(order: string[], value: string): number {
  const upper = (value || '').toUpperCase()
  const idx = order.findIndex((p) => p === upper)
  return idx === -1 ? order.length : idx
}

export function sortTicketsByPriorityAndNumber<
  T extends { priority: string; ticketNumber: number }
>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) => {
    const pA = indexOfCaseInsensitive(PRIORITY_ORDER, a.priority)
    const pB = indexOfCaseInsensitive(PRIORITY_ORDER, b.priority)
    if (pA !== pB) return pA - pB
    return a.ticketNumber - b.ticketNumber
  })
}
