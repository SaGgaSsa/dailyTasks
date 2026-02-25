'use client'

import { useState } from 'react'
import { Search, FileIcon, ImageIcon, FileText, Video, Music, File } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AttachmentWithDetails } from '@/types'
import { UploadAssetDialog } from '@/components/assets/upload-asset-dialog'
import { AttachmentRowActions } from '@/components/assets/attachment-row-actions'

interface AssetsTabProps {
    incidenceId: number
    attachments: AttachmentWithDetails[]
    currentUserId: number
    onRefresh?: () => void
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
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

export function AssetsTab({ incidenceId, attachments, currentUserId, onRefresh }: AssetsTabProps) {
    const [searchTerm, setSearchTerm] = useState('')

    const filteredAttachments = attachments.filter(attachment =>
        attachment.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const recentAttachments = [...attachments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6)

    return (
        <div className="space-y-6">
            {attachments.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium mb-3">Últimos archivos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {recentAttachments.map(attachment => {
                            const Icon = getFileIcon(attachment.mimeType)
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
                <UploadAssetDialog
                    incidenceId={incidenceId}
                    uploadedById={currentUserId}
                    onSuccess={onRefresh}
                />
            </div>

            {filteredAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                    {searchTerm ? 'No se encontraron archivos' : 'No hay archivos adjuntos'}
                </p>
            ) : (
                <div className="space-y-2">
                    {filteredAttachments.map(attachment => {
                        const Icon = getFileIcon(attachment.mimeType)
                        return (
                            <div
                                key={attachment.id}
                                className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                                <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium truncate flex-1 min-w-[200px]" title={attachment.name}>
                                    {attachment.name}
                                </span>
                                <span className="text-sm text-muted-foreground shrink-0">
                                    {attachment.uploadedBy.name || attachment.uploadedBy.username}
                                </span>
                                <span className="text-sm text-muted-foreground shrink-0 w-20 text-right">
                                    {formatFileSize(attachment.size)}
                                </span>
                                <span className="text-sm text-muted-foreground shrink-0 w-24 text-right">
                                    {formatDate(attachment.createdAt)}
                                </span>
                                <AttachmentRowActions
                                    attachment={attachment}
                                    onSuccess={onRefresh}
                                />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
