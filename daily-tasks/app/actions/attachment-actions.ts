'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import {
  canManageAttachment,
  getAttachmentAccessContext,
  getAuthenticatedUser,
  getExternalWorkItemAccessContext,
} from '@/lib/authorization'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
])

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
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
    svg: 'image/svg+xml',
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

function validateFileType(file: File, buffer: Buffer): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase()
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
    const isValidMagic = magic.some(sig => 
      sig.length <= header.length && sig.every((byte, i) => header[i] === byte)
    )
    if (!isValidMagic) {
      return { valid: false, error: 'El contenido del archivo no coincide con su extensión' }
    }
  }

  return { valid: true }
}

const ATTACHMENT_TYPE_FILE = 'FILE' as const
const ATTACHMENT_TYPE_LINK = 'LINK' as const

async function resolveExternalWorkItemIdFromForm(formData: FormData): Promise<number | null> {
    const externalWorkItemId = Number(formData.get('externalWorkItemId'))
    if (!Number.isNaN(externalWorkItemId) && externalWorkItemId > 0) {
        return externalWorkItemId
    }

    const incidenceId = Number(formData.get('incidenceId'))
    if (Number.isNaN(incidenceId) || incidenceId <= 0) {
        return null
    }

    const incidence = await db.incidence.findUnique({
        where: { id: incidenceId },
        select: { externalWorkItemId: true }
    })

    return incidence?.externalWorkItemId ?? null
}

export async function uploadAttachment(formData: FormData) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    const file = formData.get('file') as File | null
    const externalWorkItemId = await resolveExternalWorkItemIdFromForm(formData)
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null

    if (!file || !externalWorkItemId || !name) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'El archivo excede el límite de 10MB' }
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const fileValidation = validateFileType(file, buffer)
    if (!fileValidation.valid) {
        return { success: false, error: fileValidation.error }
    }

    try {
        const workItem = await db.externalWorkItem.findUnique({
            where: { id: externalWorkItemId }
        })

        if (!workItem) {
            return { success: false, error: 'External work item no encontrado' }
        }

        const accessContext = await getExternalWorkItemAccessContext(externalWorkItemId, user.id)
        if (!accessContext || !canManageAttachment(user, accessContext)) {
            return { success: false, error: 'No tiene permisos para adjuntar archivos a esta incidencia' }
        }

        const originalName = file.name
        const ext = originalName.split('.').pop() || ''
        const uniqueName = `${randomUUID()}.${ext}`
        
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'external-work-items', String(externalWorkItemId))
        
        await mkdir(uploadDir, { recursive: true })
        
        const filePath = join(uploadDir, uniqueName)
        await writeFile(filePath, buffer)

        const url = `/uploads/external-work-items/${externalWorkItemId}/${uniqueName}`

        const attachment = await db.attachment.create({
            data: {
                type: ATTACHMENT_TYPE_FILE,
                name,
                originalName,
                url,
                size: file.size,
                mimeType: file.type,
                description: description || null,
                externalWorkItemId,
                uploadedById: user.id
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: attachment }
    } catch (error) {
        console.error('Error uploading attachment:', error)
        return { success: false, error: 'Error al subir el archivo' }
    }
}

export async function updateAttachment(
    attachmentId: number,
    data: {
        name: string
        url?: string
        description?: string | null
    }
) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    const { name, url, description } = data

    if (!name || name.trim() === '') {
        return { success: false, error: 'El nombre no puede estar vacío' }
    }

    try {
        const accessContext = await getAttachmentAccessContext(attachmentId, user.id)
        if (!accessContext) {
            return { success: false, error: 'Archivo no encontrado' }
        }

        if (!canManageAttachment(user, accessContext.assignment)) {
            return { success: false, error: 'No tiene permisos para editar este archivo' }
        }

        const updateData: { name: string; url?: string; description: string | null } = {
            name: name.trim(),
            description: description?.trim() || null
        }

        if (accessContext.type === ATTACHMENT_TYPE_LINK) {
            if (!url || url.trim() === '') {
                return { success: false, error: 'El enlace no puede estar vacío' }
            }

            let normalizedUrl = url.trim()
            if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
                normalizedUrl = 'https://' + normalizedUrl
            }

            try {
                new URL(normalizedUrl)
            } catch {
                return { success: false, error: 'La URL no es válida' }
            }

            if (!normalizedUrl.startsWith('https://')) {
                return { success: false, error: 'La URL debe ser HTTPS' }
            }

            updateData.url = normalizedUrl
        }

        await db.attachment.update({
            where: { id: attachmentId },
            data: updateData
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error updating attachment:', error)
        return { success: false, error: 'Error al actualizar' }
    }
}

export async function deleteAttachment(
    attachmentId: number
) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const attachment = await getAttachmentAccessContext(attachmentId, user.id)
        if (!attachment) {
            return { success: false, error: 'Archivo no encontrado' }
        }

        if (!canManageAttachment(user, attachment.assignment)) {
            return { success: false, error: 'No tienes permiso para eliminar este archivo' }
        }

        if (attachment.isOriginal) {
            return { success: false, error: 'No se pueden eliminar archivos originales del sistema externo' }
        }

        if (attachment.type === ATTACHMENT_TYPE_FILE) {
            const relativePath = attachment.url.replace(/^\//, '')
            const filePath = join(process.cwd(), 'public', relativePath)
            try {
                await unlink(filePath)
            } catch (fsError) {
                console.warn('Could not delete physical file:', fsError)
            }
        }

        await db.attachment.delete({
            where: { id: attachmentId }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error deleting attachment:', error)
        return { success: false, error: 'Error al eliminar el archivo' }
    }
}

interface AddLinkData {
    externalWorkItemId: number
    name: string
    url: string
    description?: string
}

export async function addLinkAttachment(data: AddLinkData) {
    const user = await getAuthenticatedUser()
    if (!user) {
        return { success: false, error: 'No autorizado' }
    }

    const { externalWorkItemId, name, url, description } = data

    if (!externalWorkItemId || !name || !url) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const workItem = await db.externalWorkItem.findUnique({
            where: { id: externalWorkItemId }
        })

        if (!workItem) {
            return { success: false, error: 'External work item no encontrado' }
        }

        const accessContext = await getExternalWorkItemAccessContext(externalWorkItemId, user.id)
        if (!accessContext || !canManageAttachment(user, accessContext)) {
            return { success: false, error: 'No tiene permisos para adjuntar enlaces a esta incidencia' }
        }

        let normalizedUrl = url.trim()
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl
        }

        try {
            new URL(normalizedUrl)
        } catch {
            return { success: false, error: 'La URL no es válida' }
        }

        if (!normalizedUrl.startsWith('https://')) {
            return { success: false, error: 'La URL debe ser HTTPS' }
        }

        const attachment = await db.attachment.create({
            data: {
                type: ATTACHMENT_TYPE_LINK,
                name: name.trim(),
                url: normalizedUrl,
                originalName: null,
                size: null,
                mimeType: null,
                description: description?.trim() || null,
                externalWorkItemId,
                uploadedById: user.id
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: attachment }
    } catch (error) {
        console.error('Error adding link attachment:', error)
        return { success: false, error: 'Error al agregar el enlace' }
    }
}
