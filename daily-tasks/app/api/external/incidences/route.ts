import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Priority, TaskStatus } from '@/types/enums'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { ensureSystemScriptsPage } from '@/lib/incidence-pages'

const ATTACHMENT_TYPE_FILE = 'FILE' as const
const ATTACHMENT_TYPE_LINK = 'LINK' as const

async function getUploaderByUsername(username: string) {
  const normalizedUsername = username.trim()
  if (!normalizedUsername) return null

  const candidateUsernames = Array.from(
    new Set([normalizedUsername, normalizedUsername.toUpperCase()])
  )

  const user = await db.user.findFirst({
    where: {
      username: {
        in: candidateUsernames,
      },
    },
    select: { id: true, username: true },
  })
  if (user) return user

  return null
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
      username: formData.get('username')?.toString() || formData.get('user')?.toString(),
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
    username: (body.username as string | undefined) || (body.user as string | undefined),
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
    const { type, externalId, title, technology, username, comment, files, links } = payload

    if (!type || !externalId || !title || !technology || !username) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos: type, externalId, title, technology, username' },
        { status: 400 }
      )
    }

    const normalizedType = type.trim()
    const workItemType = await db.workItemType.findUnique({
      where: { name: normalizedType },
      select: { id: true, name: true },
    })

    if (!workItemType) {
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

    const parsedExternalId = Number(externalId)
    if (!Number.isInteger(parsedExternalId)) {
      return NextResponse.json(
        { success: false, error: `externalId inválido: ${externalId}` },
        { status: 400 }
      )
    }

    const workItem = await db.externalWorkItem.findUnique({
      where: { workItemTypeId_externalId: { workItemTypeId: workItemType.id, externalId: parsedExternalId } },
    })
    if (!workItem) {
      return NextResponse.json(
        {
          success: false,
          error: `No existe ExternalWorkItem para type=${workItemType.name} y externalId=${parsedExternalId}`,
        },
        { status: 400 }
      )
    }

    const uploader = await getUploaderByUsername(username)
    if (!uploader) {
      return NextResponse.json(
        { success: false, error: `Usuario no encontrado: ${username}` },
        { status: 400 }
      )
    }

    const incidence = await db.$transaction(async (tx) => {
      const createdIncidence = await tx.incidence.create({
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

      await ensureSystemScriptsPage(tx, createdIncidence.id, uploader.id)
      return createdIncidence
    })

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
          uploadedById: uploader.id,
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
          uploadedById: uploader.id,
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
