'use client'

import { useEffect, useRef } from 'react'
import type { SSENotificationPayload } from '@/lib/sse/emit'

const MAX_BACKOFF_MS = 30_000
const BASE_BACKOFF_MS = 1_000

interface UseNotificationStreamOptions {
  enabled: boolean
  onNotification: (payload: SSENotificationPayload) => void
}

export function useNotificationStream({ enabled, onNotification }: UseNotificationStreamOptions): void {
  const onNotificationRef = useRef(onNotification)
  onNotificationRef.current = onNotification

  useEffect(() => {
    if (!enabled) return

    let es: EventSource | null = null
    let retryCount = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    function connect() {
      if (stopped) return

      es = new EventSource('/api/notifications/stream')

      es.addEventListener('connected', () => {
        retryCount = 0
      })

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SSENotificationPayload
          onNotificationRef.current(payload)
        } catch {
          // Ignore malformed events
        }
      }

      es.onerror = () => {
        es?.close()
        es = null

        if (stopped) return

        const backoff = Math.min(BASE_BACKOFF_MS * 2 ** retryCount, MAX_BACKOFF_MS)
        retryCount++
        timeoutId = setTimeout(connect, backoff)
      }
    }

    connect()

    return () => {
      stopped = true
      if (timeoutId) clearTimeout(timeoutId)
      es?.close()
    }
  }, [enabled])
}
