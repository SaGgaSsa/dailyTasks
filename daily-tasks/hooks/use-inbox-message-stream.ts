'use client'

import { useEffect, useRef } from 'react'
import type { SSEInboxMessagePayload } from '@/lib/sse/emit'

const MAX_BACKOFF_MS = 30_000
const BASE_BACKOFF_MS = 1_000

interface UseInboxMessageStreamOptions {
  enabled: boolean
  onInboxMessage: (payload: SSEInboxMessagePayload) => void
}

export function useInboxMessageStream({ enabled, onInboxMessage }: UseInboxMessageStreamOptions): void {
  const onInboxMessageRef = useRef(onInboxMessage)
  onInboxMessageRef.current = onInboxMessage

  useEffect(() => {
    if (!enabled) return

    let es: EventSource | null = null
    let retryCount = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    function connect() {
      if (stopped) return

      es = new EventSource('/api/inbox-messages/stream')

      es.addEventListener('connected', () => {
        retryCount = 0
      })

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SSEInboxMessagePayload
          onInboxMessageRef.current(payload)
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
