'use client'

import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useNotificationStream } from '@/hooks/use-notification-stream'
import type { SSENotificationPayload } from '@/lib/sse/emit'

const NOTIFICATION_EVENT = 'notification-received'

export function NotificationStreamProvider() {
  const { status } = useSession()
  const enabled = status === 'authenticated'

  const onNotification = useCallback((payload: SSENotificationPayload) => {
    toast.info(payload.message)

    const event = new CustomEvent<SSENotificationPayload>(NOTIFICATION_EVENT, { detail: payload })
    window.dispatchEvent(event)
  }, [])

  useNotificationStream({ enabled, onNotification })

  return null
}

export { NOTIFICATION_EVENT }
