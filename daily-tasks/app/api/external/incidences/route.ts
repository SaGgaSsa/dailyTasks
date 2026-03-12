import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { db } from '@/lib/db'
import { TaskType, Priority, TaskStatus } from '@/types/enums'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const ATTACHMENT_TYPE_FILE = 'FILE' as const
const ATTACHMENT_TYPE_LINK = 'LINK' as const

async function getSystemUploaderId() {
  const preferredUser = await db.user.findFirst({
    where: { username: 'ADM' },
    select: { id: true },
  })
  if (preferredUser) return preferredUser.id

  const adminUser = await db.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  })
  if (adminUser) return adminUser.id

  const fallbackUser = await db.user.findFirst({
    select: { id: true },
  })

  return fallbackUser?.id ?? null
}

async function parseIncomingPayload(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const files = formData
      .getAll('files')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    return {
      type: formData.get('type')?.toString(),
      externalId: formData.get('externalId')?.toString(),
      title: formData.get('title')?.toString(),
      technology: formData.get('technology')?.toString(),
      comment: formData.get('comment')?.toString() || null,
      files,
      links: [] as Array<{ name: string; url: string; description?: string | null }>,
    }
  }

  const body = await request.json()
  const filesFromJson = Array.isArray(body.files) ? body.files : []

  const links = filesFromJson
    .filter((file: unknown) => {
      if (!file || typeof file !== 'object') return false
      const candidate = file as Record<string, unknown>
      return typeof candidate.url === 'string' && candidate.url.trim().length > 0
    })
    .map((file: unknown) => {
      const candidate = file as Record<string, unknown>
      return {
        name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Archivo externo',
        url: (candidate.url as string).trim(),
        description: typeof candidate.description === 'string' ? candidate.description.trim() : null,
      }
    })

  return {
    type: body.type as string | undefined,
    externalId: body.externalId?.toString(),
    title: body.title as string | undefined,
    technology: body.technology as string | undefined,
    comment: (body.comment as string | undefined) || null,
    files: [] as File[],
    links,
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiSecret = request.headers.get('x-api-secret')

    if (!apiSecret) {
      return NextResponse.json(
        { error: 'Header x-api-secret es requerido' },
        { status: 401 }
      )
    }

    if (apiSecret !== process.env.EXTERNAL_API_SECRET) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const payload = await parseIncomingPayload(request)
    const { type, externalId, title, technology, comment, files, links } = payload

    if (!type || !externalId || !title || !technology) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: type, externalId, title, technology' },
        { status: 400 }
      )
    }

    const taskType = type as TaskType

    if (!Object.values(TaskType).includes(taskType)) {
      return NextResponse.json(
        { success: false, error: `Tipo inválido: ${type}` },
        { status: 400 }
      )
    }

    const tech = await db.technology.findUnique({ where: { name: technology } })
    if (!tech) {
      return NextResponse.json(
        { success: false, error: `Tecnología inválida: ${technology}` },
        { status: 400 }
      )
    }

    const workItem = await db.externalWorkItem.upsert({
      where: { type_externalId: { type: taskType, externalId: Number(externalId) } },
      create: { type: taskType, externalId: Number(externalId), title },
      update: { title },
    })
    revalidateTag('external-work-items', 'default')

    const incidence = await db.incidence.create({
      data: {
        externalWorkItemId: workItem.id,
        description: title,
        technologyId: tech.id,
        status: TaskStatus.BACKLOG,
        priority: Priority.MEDIUM,
        estimatedTime: 0,
        comment: comment || title,
      },
    })

    const uploadedById = await getSystemUploaderId()
    if (!uploadedById) {
      return NextResponse.json(
        { success: false, error: 'No existe usuario para registrar archivos externos' },
        { status: 500 }
      )
    }

    for (const file of files) {
      const originalName = file.name
      const ext = originalName.split('.').pop() || 'bin'
      const uniqueName = `${randomUUID()}.${ext}`
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'external-work-items', String(workItem.id))
      await mkdir(uploadDir, { recursive: true })
      const bytes = await file.arrayBuffer()
      await writeFile(join(uploadDir, uniqueName), Buffer.from(bytes))

      await db.attachment.create({
        data: {
          type: ATTACHMENT_TYPE_FILE,
          name: originalName.replace(/\.[^/.]+$/, '') || originalName,
          originalName,
          url: `/uploads/external-work-items/${workItem.id}/${uniqueName}`,
          size: file.size,
          mimeType: file.type || null,
          description: null,
          externalWorkItemId: workItem.id,
          uploadedById,
          isOriginal: true,
        },
      })
    }

    for (const link of links) {
      let normalizedUrl = link.url
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`
      }

      try {
        new URL(normalizedUrl)
      } catch {
        continue
      }

      if (!normalizedUrl.startsWith('https://')) {
        continue
      }

      await db.attachment.create({
        data: {
          type: ATTACHMENT_TYPE_LINK,
          name: link.name,
          url: normalizedUrl,
          originalName: null,
          size: null,
          mimeType: null,
          description: link.description || null,
          externalWorkItemId: workItem.id,
          uploadedById,
          isOriginal: true,
        },
      })
    }

    return NextResponse.json(
      { success: true, incidenceId: incidence.id, externalWorkItemId: workItem.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en ingesta externa:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
