const PRIORITY_ORDER = ['BLOQUEANTE', 'HIGH', 'MEDIUM', 'LOW']

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
