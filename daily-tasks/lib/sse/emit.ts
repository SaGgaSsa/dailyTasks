import { getConnections } from './connections'
import { InboxMessageType } from '@/types/enums'

export interface SSEInboxMessagePayload {
  id: number
  type: InboxMessageType
  message: string
  referenceId: number
  referenceType: string
  createdAt: Date
}

export function emitInboxMessageToUsers(userIds: number[], data: SSEInboxMessagePayload): void {
  const eventData = `data: ${JSON.stringify(data)}\n\n`

  for (const userId of userIds) {
    const controllers = getConnections(userId)
    for (const controller of controllers) {
      try {
        controller.enqueue(eventData)
      } catch {
        // Controller may be closed — ignore
      }
    }
  }
}
