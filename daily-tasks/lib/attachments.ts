import { resolve, join, relative, extname, sep } from 'path'

const DEFAULT_ATTACHMENTS_ROOT = ['public', 'uploads']
const UPLOADS_URL_PREFIX = '/uploads/'

export const MAX_FILE_SIZE = 10 * 1024 * 1024

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
])

export const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'txt', 'csv', 'zip',
])

const MAGIC_BYTES: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]],
  jpg: [[0xFF, 0xD8, 0xFF]],
  png: [[0x89, 0x50, 0x4E, 0x47]],
  gif: [[0x47, 0x49, 0x46]],
  zip: [[0x50, 0x4B, 0x03, 0x04]],
}

function getMimeFromExtension(ext: string): string | null {
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
  }

  return mimeMap[ext.toLowerCase()] || null
}

export function validateUploadedFile(file: File, buffer: Buffer): { valid: boolean; error?: string } {
  const ext = extname(file.name).replace(/^\./, '').toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `Extensión no permitida: .${ext || 'desconocida'}` }
  }

  const expectedMime = getMimeFromExtension(ext)
  const fileMime = file.type || expectedMime

  if (!fileMime || (!ALLOWED_MIME_TYPES.has(fileMime) && fileMime !== expectedMime)) {
    return { valid: false, error: 'Tipo de archivo no permitido' }
  }

  const magic = MAGIC_BYTES[ext]
  if (magic) {
    const header = Array.from(buffer.subarray(0, 4))
    const isValidMagic = magic.some((signature) =>
      signature.length <= header.length && signature.every((byte, index) => header[index] === byte)
    )

    if (!isValidMagic) {
      return { valid: false, error: 'El contenido del archivo no coincide con su extensión' }
    }
  }

  return { valid: true }
}

export function normalizeAttachmentUrl(url: string): { valid: boolean; normalizedUrl?: string; error?: string } {
  let normalizedUrl = url.trim()

  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`
  }

  try {
    const parsedUrl = new URL(normalizedUrl)

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, error: 'La URL debe usar http o https' }
    }

    return { valid: true, normalizedUrl: parsedUrl.toString() }
  } catch {
    return { valid: false, error: 'La URL no es válida' }
  }
}

export function getAttachmentsRootDir(): string {
  const configuredRoot = process.env.ATTACHMENTS_ROOT_DIR?.trim()
  return configuredRoot ? resolve(configuredRoot) : resolve(process.cwd(), ...DEFAULT_ATTACHMENTS_ROOT)
}

export function getExternalWorkItemAttachmentsDir(externalWorkItemId: number): string {
  return join(getAttachmentsRootDir(), 'external-work-items', String(externalWorkItemId))
}

export function createAttachmentUrl(relativePath: string): string {
  return `${UPLOADS_URL_PREFIX}${relativePath.replace(/\\/g, '/')}`
}

export function resolveStoredAttachmentPath(url: string): string | null {
  if (!url.startsWith(UPLOADS_URL_PREFIX)) {
    return null
  }

  const relativePath = url.slice(UPLOADS_URL_PREFIX.length)
  if (!relativePath) {
    return null
  }

  const rootDir = getAttachmentsRootDir()
  const resolvedPath = resolve(rootDir, relativePath)
  const relativeToRoot = relative(rootDir, resolvedPath)

  if (relativeToRoot === '' || relativeToRoot === '.' || relativeToRoot.startsWith('..') || relativeToRoot.includes(`..${sep}`)) {
    return null
  }

  return resolvedPath
}
