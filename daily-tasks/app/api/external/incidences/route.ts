import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Priority, TaskStatus } from '@/types/enums'
import { mkdir, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { join } from 'path'
import {
  createAttachmentUrl,
  getExternalWorkItemAttachmentsDir,
  normalizeAttachmentUrl,
  validateUploadedFile,
} from '@/lib/attachments'
import {
  externalApiDisabledResponse,
  externalApiUnauthorizedResponse,
  isExternalApiEnabled,
  validateExternalApiSecret,
} from '@/lib/external-api'
import { normalizeUsername } from '@/lib/usernames'

const ATTACHMENT_TYPE_FILE = 'FILE' as const
const ATTACHMENT_TYPE_LINK = 'LINK' as const

async function getUploaderByUsername(username: string) {
  const normalizedUsername = normalizeUsername(username)
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
    if (!isExternalApiEnabled()) {
      return externalApiDisabledResponse()
    }

    if (!validateExternalApiSecret(request.headers.get('x-api-secret'))) {
      return externalApiUnauthorizedResponse()
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

    const validatedFiles = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const fileValidation = validateUploadedFile(file, buffer)

        return {
          file,
          buffer,
          fileValidation,
        }
      })
    )

    const invalidFile = validatedFiles.find(({ fileValidation }) => !fileValidation.valid)
    if (invalidFile) {
      return NextResponse.json(
        { success: false, error: invalidFile.fileValidation.error },
        { status: 400 }
      )
    }

    const normalizedLinks = links.flatMap((link: { name: string; url: string; description?: string | null }) => {
      const normalizedLink = normalizeAttachmentUrl(link.url)
      if (!normalizedLink.valid || !normalizedLink.normalizedUrl) {
        return []
      }

      return [{
        name: link.name,
        description: link.description || null,
        url: normalizedLink.normalizedUrl,
      }]
    })

    const existingIncidence = await db.incidence.findFirst({
      where: { externalWorkItemId: workItem.id },
      select: { id: true },
    })

    if (existingIncidence) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe una incidencia para ExternalWorkItem=${workItem.id}`,
        },
        { status: 409 }
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

      return createdIncidence
    })

    for (const { file, buffer } of validatedFiles) {
      const originalName = file.name
      const ext = originalName.split('.').pop() || 'bin'
      const uniqueName = `${randomUUID()}.${ext}`
      const uploadDir = getExternalWorkItemAttachmentsDir(workItem.id)
      await mkdir(uploadDir, { recursive: true })
      await writeFile(join(uploadDir, uniqueName), buffer)

      await db.attachment.create({
        data: {
          type: ATTACHMENT_TYPE_FILE,
          name: originalName.replace(/\.[^/.]+$/, '') || originalName,
          originalName,
          url: createAttachmentUrl(`external-work-items/${workItem.id}/${uniqueName}`),
          size: file.size,
          mimeType: file.type || null,
          description: null,
          externalWorkItemId: workItem.id,
          uploadedById: uploader.id,
          isOriginal: true,
        },
      })
    }

    for (const link of normalizedLinks) {
      await db.attachment.create({
        data: {
          type: ATTACHMENT_TYPE_LINK,
          name: link.name,
          url: link.url,
          originalName: null,
          size: null,
          mimeType: null,
          description: link.description,
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
