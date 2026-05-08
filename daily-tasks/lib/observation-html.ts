export const TICKET_IMAGE_URL_PREFIX = '/uploads/tickets/'

const ALLOWED_HTML_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'code',
  'pre',
  'ul',
  'ol',
  'li',
  'blockquote',
  'img',
])

function escapeHtmlAttribute(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function sanitizeTag(rawTag: string) {
  const match = rawTag.match(/^<\/?\s*([a-zA-Z0-9-]+)([\s\S]*?)\/?\s*>$/)
  if (!match) return ''

  const tagName = match[1].toLowerCase()
  if (!ALLOWED_HTML_TAGS.has(tagName)) return ''

  const isClosing = /^<\//.test(rawTag)
  if (tagName === 'br') return '<br>'
  if (tagName === 'img') {
    if (isClosing) return ''
    const srcMatch = rawTag.match(/\ssrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const src = srcMatch?.[2] ?? srcMatch?.[3] ?? srcMatch?.[4] ?? ''
    if (!src.startsWith(TICKET_IMAGE_URL_PREFIX)) return ''
    return `<img src="${escapeHtmlAttribute(src)}">`
  }

  return isClosing ? `</${tagName}>` : `<${tagName}>`
}

export function sanitizeObservationHtml(value: string | null | undefined) {
  const input = value?.trim()
  if (!input) return null

  const withoutScripts = input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
  const withoutComments = withoutScripts.replace(/<!--[\s\S]*?-->/g, '')
  const sanitized = withoutComments.replace(/<[^>]*>/g, sanitizeTag).trim()

  return sanitized || null
}

export function extractTicketImageUrls(html: string | null | undefined) {
  if (!html) return []

  const urls = new Set<string>()
  for (const match of html.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*>/gi)) {
    if (match[1].startsWith(TICKET_IMAGE_URL_PREFIX)) {
      urls.add(match[1])
    }
  }

  return Array.from(urls)
}
