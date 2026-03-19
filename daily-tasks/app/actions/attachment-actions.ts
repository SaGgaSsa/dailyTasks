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
import {
  createAttachmentUrl,
  getExternalWorkItemAttachmentsDir,
  MAX_FILE_SIZE,
  normalizeAttachmentUrl,
  resolveStoredAttachmentPath,
  validateUploadedFile,
} from '@/lib/attachments'

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

    const fileValidation = validateUploadedFile(file, buffer)
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
        
        const uploadDir = getExternalWorkItemAttachmentsDir(externalWorkItemId)
        
        await mkdir(uploadDir, { recursive: true })
        
        const filePath = join(uploadDir, uniqueName)
        await writeFile(filePath, buffer)

        const url = createAttachmentUrl(`external-work-items/${externalWorkItemId}/${uniqueName}`)

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

            const normalizedLink = normalizeAttachmentUrl(url)
            if (!normalizedLink.valid || !normalizedLink.normalizedUrl) {
                return { success: false, error: normalizedLink.error || 'La URL no es válida' }
            }

            updateData.url = normalizedLink.normalizedUrl
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
            const filePath = resolveStoredAttachmentPath(attachment.url)
            if (!filePath) {
                return { success: false, error: 'La ruta del archivo adjunto no es válida' }
            }
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

        const normalizedLink = normalizeAttachmentUrl(url)
        if (!normalizedLink.valid || !normalizedLink.normalizedUrl) {
            return { success: false, error: normalizedLink.error || 'La URL no es válida' }
        }

        const attachment = await db.attachment.create({
            data: {
                type: ATTACHMENT_TYPE_LINK,
                name: name.trim(),
                url: normalizedLink.normalizedUrl,
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
