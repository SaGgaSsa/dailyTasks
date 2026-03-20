import { getConnections } from './connections'
import { NotificationType } from '@/types/enums'

export interface SSENotificationPayload {
  id: number
  type: NotificationType
  message: string
  referenceId: number
  referenceType: string
  createdAt: Date
}

export function emitNotificationToUsers(userIds: number[], data: SSENotificationPayload): void {
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
