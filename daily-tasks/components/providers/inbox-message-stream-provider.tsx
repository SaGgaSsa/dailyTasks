'use client'

import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useInboxMessageStream } from '@/hooks/use-inbox-message-stream'
import type { SSEInboxMessagePayload } from '@/lib/sse/emit'

const INBOX_MESSAGE_EVENT = 'inbox-message-received'

export function InboxMessageStreamProvider() {
  const { status } = useSession()
  const enabled = status === 'authenticated'

  const onInboxMessage = useCallback((payload: SSEInboxMessagePayload) => {
    toast.info(payload.message)

    const event = new CustomEvent<SSEInboxMessagePayload>(INBOX_MESSAGE_EVENT, { detail: payload })
    window.dispatchEvent(event)
  }, [])

  useInboxMessageStream({ enabled, onInboxMessage })

  return null
}

export { INBOX_MESSAGE_EVENT }
