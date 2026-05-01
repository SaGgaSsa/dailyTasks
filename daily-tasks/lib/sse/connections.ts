// Global connection manager for SSE — persists across HMR in dev (same pattern as lib/db.ts)

type SSEController = ReadableStreamDefaultController

declare global {
  var sseConnections: Map<number, Set<SSEController>> | undefined
}

function getConnectionMap(): Map<number, Set<SSEController>> {
  if (!globalThis.sseConnections) {
    globalThis.sseConnections = new Map()
  }
  return globalThis.sseConnections
}

export function addConnection(userId: number, controller: SSEController): void {
  const map = getConnectionMap()
  if (!map.has(userId)) {
    map.set(userId, new Set())
  }
  map.get(userId)!.add(controller)
}

export function removeConnection(userId: number, controller: SSEController): void {
  const map = getConnectionMap()
  const controllers = map.get(userId)
  if (!controllers) return
  controllers.delete(controller)
  if (controllers.size === 0) {
    map.delete(userId)
  }
}

export function getConnections(userId: number): Set<SSEController> {
  return getConnectionMap().get(userId) ?? new Set()
}
