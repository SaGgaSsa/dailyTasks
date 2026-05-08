import { existsSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'tickets')
const olderThanHours = Number(process.env.TICKET_IMAGE_CLEANUP_OLDER_THAN_HOURS ?? '24')
const cutoff = new Date(Date.now() - Math.max(1, olderThanHours) * 60 * 60 * 1000)

function filePathFromUrl(url) {
  return path.join(process.cwd(), 'public', url)
}

async function deleteFile(url) {
  const filePath = filePathFromUrl(url)
  if (!filePath.startsWith(uploadsDir)) return
  await unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })
}

try {
  const [images, tickets, rejectionTasks] = await Promise.all([
    prisma.ticketImage.findMany({
      select: { id: true, ticketId: true, draftId: true, url: true, createdAt: true },
    }),
    prisma.ticketQA.findMany({
      select: { observations: true },
    }),
    prisma.task.findMany({
      where: { isQaReported: true, description: { not: null } },
      select: { description: true },
    }),
  ])

  const referencedHtml = [
    ...tickets.map((ticket) => ticket.observations ?? ''),
    ...rejectionTasks.map((task) => task.description ?? ''),
  ].join('\n')

  const removable = images.filter((image) => {
    if (!image.ticketId && image.createdAt < cutoff) return true
    if (image.ticketId && !referencedHtml.includes(image.url)) return true
    return false
  })

  if (removable.length > 0) {
    await prisma.ticketImage.deleteMany({ where: { id: { in: removable.map((image) => image.id) } } })
    await Promise.all(removable.map((image) => deleteFile(image.url)))
  }

  const diskFiles = existsSync(uploadsDir)
    ? await import('node:fs/promises').then((fs) => fs.readdir(uploadsDir))
    : []
  const knownUrls = new Set(images.filter((image) => !removable.some((item) => item.id === image.id)).map((image) => image.url))
  const orphanFiles = diskFiles.filter((filename) => !knownUrls.has(`/uploads/tickets/${filename}`))
  await Promise.all(orphanFiles.map((filename) => deleteFile(`/uploads/tickets/${filename}`)))

  console.log(`Deleted ${removable.length} ticket image records and ${orphanFiles.length} orphan files.`)
} finally {
  await prisma.$disconnect()
}
