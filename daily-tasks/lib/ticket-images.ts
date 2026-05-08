import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import type { Prisma } from '.prisma/client'

import {
  extractTicketImageUrls,
  sanitizeObservationHtml,
  TICKET_IMAGE_URL_PREFIX,
} from '@/lib/observation-html'

export const TICKET_IMAGE_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'tickets')
export const DEFAULT_TICKET_IMAGE_MAX_BYTES = 2_097_152

const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
} as const

type TicketImageClient = Pick<Prisma.TransactionClient, 'ticketImage'>

export { extractTicketImageUrls, sanitizeObservationHtml, TICKET_IMAGE_URL_PREFIX }

export function getTicketImageMaxBytes() {
  const configured = Number(process.env.TICKET_IMAGE_MAX_BYTES)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TICKET_IMAGE_MAX_BYTES
}

export function getAllowedTicketImageExtensions(mimeType: string) {
  return ALLOWED_IMAGE_TYPES[mimeType as keyof typeof ALLOWED_IMAGE_TYPES] ?? null
}

export function isAllowedTicketImageMimeType(mimeType: string) {
  return Boolean(getAllowedTicketImageExtensions(mimeType))
}

export function hasValidTicketImageMagicBytes(bytes: Uint8Array, mimeType: string) {
  if (mimeType === 'image/png') {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
  }

  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }

  if (mimeType === 'image/webp') {
    return bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
  }

  return false
}

export async function writeTicketImageFile(bytes: Uint8Array, extension: string) {
  await mkdir(TICKET_IMAGE_UPLOAD_DIR, { recursive: true })

  const filename = `${randomUUID()}${extension}`
  const filePath = path.join(TICKET_IMAGE_UPLOAD_DIR, filename)
  await writeFile(filePath, bytes)

  return {
    filename,
    filePath,
    url: `${TICKET_IMAGE_URL_PREFIX}${filename}`,
  }
}

export async function deleteTicketImageFile(url: string) {
  const filePath = path.join(process.cwd(), 'public', url)
  if (!filePath.startsWith(TICKET_IMAGE_UPLOAD_DIR)) return
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error
  })
}

export async function reconcileTicketImages(
  client: TicketImageClient,
  input: {
    ticketId: number
    html: string | null | undefined
    draftId?: string | null
  }
) {
  const referencedUrls = extractTicketImageUrls(input.html)
  const referencedUrlSet = new Set(referencedUrls)

  await client.ticketImage.updateMany({
    where: {
      url: { in: referencedUrls },
      OR: [
        { ticketId: input.ticketId },
        ...(input.draftId ? [{ draftId: input.draftId }] : []),
      ],
    },
    data: {
      ticketId: input.ticketId,
      draftId: null,
    },
  })

  const staleWhere: Prisma.TicketImageWhereInput = {
    OR: [
      { ticketId: input.ticketId },
      ...(input.draftId ? [{ draftId: input.draftId }] : []),
    ],
  }
  if (referencedUrls.length > 0) {
    staleWhere.NOT = { url: { in: referencedUrls } }
  }

  const staleImages = await client.ticketImage.findMany({
    where: staleWhere,
    select: { id: true, url: true },
  })

  const staleIds = staleImages
    .filter((image) => !referencedUrlSet.has(image.url))
    .map((image) => image.id)

  if (staleIds.length > 0) {
    await client.ticketImage.deleteMany({ where: { id: { in: staleIds } } })
    await Promise.all(staleImages.map((image) => deleteTicketImageFile(image.url)))
  }
}
