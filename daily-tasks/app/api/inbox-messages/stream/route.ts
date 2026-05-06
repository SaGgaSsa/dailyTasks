export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { addConnection, removeConnection } from '@/lib/sse/connections'
import { NextResponse } from 'next/server'

const HEARTBEAT_INTERVAL_MS = 30_000

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const userId = Number(session.user.id)

  const stream = new ReadableStream({
    start(controller) {
      addConnection(userId, controller)

      // Send initial connected event
      controller.enqueue('event: connected\ndata: {}\n\n')

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(': heartbeat\n\n')
        } catch {
          clearInterval(heartbeat)
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Store interval ref on controller for cleanup
      ;(controller as unknown as { _heartbeat: ReturnType<typeof setInterval> })._heartbeat = heartbeat
    },
    cancel(controller) {
      const hb = (controller as unknown as { _heartbeat: ReturnType<typeof setInterval> })._heartbeat
      if (hb) clearInterval(hb)
      removeConnection(userId, controller)
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
