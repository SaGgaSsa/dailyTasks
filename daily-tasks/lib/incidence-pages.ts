import { IncidencePageType, Prisma } from '@prisma/client'

export const SCRIPT_PAGE_TITLE = 'Scripts'

function blockHasTextContent(block: unknown): boolean {
  if (!block || typeof block !== 'object') return false

  const candidate = block as Record<string, unknown>
  const content = candidate.content
  const children = candidate.children

  if (typeof content === 'string' && content.trim().length > 0) {
    return true
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (typeof item === 'string' && item.trim().length > 0) return true
      if (item && typeof item === 'object') {
        const text = (item as { text?: unknown }).text
        if (typeof text === 'string' && text.trim().length > 0) return true
      }
    }
  }

  if (Array.isArray(children)) {
    return children.some(blockHasTextContent)
  }

  return false
}

export function pageHasMeaningfulContent(content: Prisma.JsonValue | null | undefined): boolean {
  if (!Array.isArray(content)) return false
  return content.some(blockHasTextContent)
}

export async function ensureSystemScriptsPage(
  tx: Prisma.TransactionClient,
  incidenceId: number,
  authorId: number
) {
  const existing = await tx.incidencePage.findFirst({
    where: { incidenceId, pageType: IncidencePageType.SYSTEM_SCRIPTS },
  })

  if (existing) return existing

  return tx.incidencePage.create({
    data: {
      incidenceId,
      authorId,
      title: SCRIPT_PAGE_TITLE,
      content: Prisma.JsonNull,
      pageType: IncidencePageType.SYSTEM_SCRIPTS,
    },
  })
}
