'use client'

import { useState } from 'react'
import { Search, FileIcon, ImageIcon, FileText, Video, Music, File, Link as LinkIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AttachmentWithDetails } from '@/types'
import { UploadFileDialog } from '@/components/assets/upload-file-dialog'
import { AddLinkDialog } from '@/components/assets/add-link-dialog'
import { AttachmentRowActions } from '@/components/assets/attachment-row-actions'
import { UserRole } from '@prisma/client'

interface AssetsTabProps {
    externalWorkItemId: number
    attachments: AttachmentWithDetails[]
    currentUserRole: UserRole
    isAssignedToCurrentUser: boolean
    onRefresh?: () => void
}

function formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string | null) {
    if (!mimeType) return File
    if (mimeType.startsWith('image/')) return ImageIcon
    if (mimeType === 'application/pdf') return FileText
    if (mimeType.startsWith('video/')) return Video
    if (mimeType.startsWith('audio/')) return Music
    return FileIcon
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

export function AssetsTab({
    externalWorkItemId,
    attachments,
    currentUserRole,
    isAssignedToCurrentUser,
    onRefresh,
}: AssetsTabProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [isUploadFileOpen, setIsUploadFileOpen] = useState(false)
    const [isAddLinkOpen, setIsAddLinkOpen] = useState(false)
    const canManageAttachments =
        currentUserRole === UserRole.ADMIN ||
        (currentUserRole === UserRole.DEV && isAssignedToCurrentUser)

    const getDateOnly = (date: Date) => {
        const d = new Date(date)
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    }

    const sortedAttachments = [...attachments].sort((a, b) => {
        const dateA = getDateOnly(a.createdAt)
        const dateB = getDateOnly(b.createdAt)
        if (dateB !== dateA) return dateB - dateA
        return a.name.localeCompare(b.name)
    })

    const filteredAttachments = sortedAttachments.filter(attachment =>
        attachment.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const recentAttachments = sortedAttachments.slice(0, 6)

    return (
        <div className="space-y-6">
            {attachments.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium mb-3">Últimos archivos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {recentAttachments.map(attachment => {
                            const isLink = attachment.type === 'LINK'
                            const Icon = isLink ? LinkIcon : getFileIcon(attachment.mimeType)
                            return (
                                <div
                                    key={attachment.id}
                                    className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                                    <span className="text-sm truncate flex-1" title={attachment.name}>
                                        {attachment.name}
                                    </span>
                                    <AttachmentRowActions
                                        attachment={attachment}
                                        canManage={canManageAttachments}
                                        onSuccess={onRefresh}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar archivos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                {canManageAttachments && (
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsAddLinkOpen(true)}
                        >
                            <LinkIcon className="h-4 w-4" />
                            Vincular Enlace
                        </Button>
                        <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsUploadFileOpen(true)}
                        >
                            <FileIcon className="h-4 w-4" />
                            Subir Archivo
                        </Button>
                    </div>
                )}
            </div>

            {filteredAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                    {searchTerm ? 'No se encontraron archivos' : 'No hay archivos adjuntos'}
                </p>
            ) : (
                <div className="space-y-2">
                    {filteredAttachments.map(attachment => {
                        const isLink = attachment.type === 'LINK'
                        const Icon = isLink ? LinkIcon : getFileIcon(attachment.mimeType)
                        return (
                            <div
                                key={attachment.id}
                                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-[200px] truncate">
                                    <span className="text-sm font-medium truncate block" title={attachment.name}>
                                        {attachment.name}
                                    </span>
                                    {attachment.description && (
                                        <span className="text-xs text-muted-foreground truncate block" title={attachment.description}>
                                            {attachment.description}
                                        </span>
                                    )}
                                </div>
                                {!isLink && (
                                    <span className="text-sm text-muted-foreground shrink-0 w-20 text-right">
                                        {formatFileSize(attachment.size)}
                                    </span>
                                )}
                                <span className="text-sm text-muted-foreground shrink-0 w-24 text-right">
                                    {formatDate(attachment.createdAt)}
                                </span>
                                <span className="text-sm text-muted-foreground shrink-0">
                                    {attachment.uploadedBy.name || attachment.uploadedBy.username}
                                </span>
                                <AttachmentRowActions
                                    attachment={attachment}
                                    canManage={canManageAttachments}
                                    onSuccess={onRefresh}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            <UploadFileDialog
                open={isUploadFileOpen}
                onOpenChange={setIsUploadFileOpen}
                externalWorkItemId={externalWorkItemId}
                onSuccess={onRefresh}
            />

            <AddLinkDialog
                open={isAddLinkOpen}
                onOpenChange={setIsAddLinkOpen}
                externalWorkItemId={externalWorkItemId}
                onSuccess={onRefresh}
            />
        </div>
    )
}
