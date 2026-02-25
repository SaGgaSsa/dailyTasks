'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ATTACHMENT_TYPE_FILE = 'FILE' as const
const ATTACHMENT_TYPE_LINK = 'LINK' as const

export async function uploadAttachment(formData: FormData) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    const file = formData.get('file') as File | null
    const incidenceId = Number(formData.get('incidenceId'))
    const name = formData.get('name') as string
    const uploadedById = Number(formData.get('uploadedById'))
    const description = formData.get('description') as string | null

    if (!file || !incidenceId || !name || !uploadedById) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'El archivo excede el límite de 10MB' }
    }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
        }

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const originalName = file.name
        const ext = originalName.split('.').pop() || ''
        const uniqueName = `${randomUUID()}.${ext}`
        
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'incidences', String(incidenceId))
        
        await mkdir(uploadDir, { recursive: true })
        
        const filePath = join(uploadDir, uniqueName)
        await writeFile(filePath, buffer)

        const url = `/uploads/incidences/${incidenceId}/${uniqueName}`

        const attachment = await db.attachment.create({
            data: {
                type: ATTACHMENT_TYPE_FILE,
                name,
                originalName,
                url,
                size: file.size,
                mimeType: file.type,
                description: description || null,
                incidenceId,
                uploadedById
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: attachment }
    } catch (error) {
        console.error('Error uploading attachment:', error)
        return { success: false, error: 'Error al subir el archivo' }
    }
}

export async function updateAttachmentName(
    attachmentId: number,
    newName: string
) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    if (!newName || newName.trim() === '') {
        return { success: false, error: 'El nombre no puede estar vacío' }
    }

    try {
        const attachment = await db.attachment.findUnique({
            where: { id: attachmentId }
        })

        if (!attachment) {
            return { success: false, error: 'Archivo no encontrado' }
        }

        await db.attachment.update({
            where: { id: attachmentId },
            data: { name: newName.trim() }
        })

        revalidatePath('/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Error updating attachment name:', error)
        return { success: false, error: 'Error al actualizar el nombre' }
    }
}

export async function deleteAttachment(
    attachmentId: number
) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    try {
        const attachment = await db.attachment.findUnique({
            where: { id: attachmentId },
            include: { incidence: true }
        })

        if (!attachment) {
            return { success: false, error: 'Archivo no encontrado' }
        }

        const isOwner = attachment.uploadedById === Number(session.user.id)
        const isAdmin = session.user.role === 'ADMIN'

        if (!isOwner && !isAdmin) {
            return { success: false, error: 'No tienes permiso para eliminar este archivo' }
        }

        if (attachment.type === ATTACHMENT_TYPE_FILE) {
            const filePath = join(process.cwd(), 'public', attachment.url)
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
    incidenceId: number
    name: string
    url: string
    description?: string
    uploadedById: number
}

export async function addLinkAttachment(data: AddLinkData) {
    const session = await auth()
    if (!session?.user) {
        return { success: false, error: 'No autorizado' }
    }

    const { incidenceId, name, url, description, uploadedById } = data

    if (!incidenceId || !name || !url || !uploadedById) {
        return { success: false, error: 'Faltan datos requeridos' }
    }

    try {
        const incidence = await db.incidence.findUnique({
            where: { id: incidenceId }
        })

        if (!incidence) {
            return { success: false, error: 'Incidencia no encontrada' }
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
                incidenceId,
                uploadedById
            }
        })

        revalidatePath('/dashboard')
        return { success: true, data: attachment }
    } catch (error) {
        console.error('Error adding link attachment:', error)
        return { success: false, error: 'Error al agregar el enlace' }
    }
}
