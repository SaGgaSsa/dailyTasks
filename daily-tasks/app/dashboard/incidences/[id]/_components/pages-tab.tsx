'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus, FileText, Calendar, MoreVertical, Trash2, Star, Link, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IncidencePageWithAuthor } from '@/types'
import { createPage, deletePage, setMainIncidencePage } from '@/app/actions/pages'
import { toast } from 'sonner'
import { IncidencePageType } from '@prisma/client'

interface PagesTabProps {
    incidenceId: number
    pages: IncidencePageWithAuthor[]
    currentUserId: number
    onRefresh?: () => void
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })
}

export function PagesTab({ incidenceId, pages, currentUserId, onRefresh }: PagesTabProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [pageToDelete, setPageToDelete] = useState<IncidencePageWithAuthor | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isSettingMain, setIsSettingMain] = useState(false)

    const handleCreatePage = async () => {
        setIsSubmitting(true)
        try {
            const result = await createPage(incidenceId, '')
            if (result.success && result.data) {
                router.push(`/dashboard/incidences/${incidenceId}/pages/${result.data.id}`)
                onRefresh?.()
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteClick = (page: IncidencePageWithAuthor, e: React.MouseEvent) => {
        e.stopPropagation()
        setPageToDelete(page)
        setDeleteDialogOpen(true)
    }

    const handleSetMainPage = async (page: IncidencePageWithAuthor, e: React.MouseEvent) => {
        e.stopPropagation()
        if (page.isMainPage) return

        setIsSettingMain(true)
        try {
            const result = await setMainIncidencePage(incidenceId, page.id)
            if (result.success) {
                toast.success('Página fijada como principal')
                onRefresh?.()
            } else {
                toast.error(result.error || 'Error al fijar la página')
            }
        } finally {
            setIsSettingMain(false)
        }
    }

    const handleCopyLink = async (page: IncidencePageWithAuthor, e: React.MouseEvent) => {
        e.stopPropagation()
        const url = `${window.location.origin}/dashboard/incidences/${incidenceId}/pages/${page.id}`
        await navigator.clipboard.writeText(url)
        toast.success('Enlace copiado al portapapeles')
    }

    const handleDeleteConfirm = async () => {
        if (!pageToDelete) return

        setIsDeleting(true)
        try {
            const result = await deletePage(pageToDelete.id)
            if (result.success) {
                toast.success('Página eliminada')
                onRefresh?.()
            } else {
                toast.error(result.error || 'Error al eliminar la página')
            }
        } finally {
            setIsDeleting(false)
            setDeleteDialogOpen(false)
            setPageToDelete(null)
        }
    }

    const sortedPages = [...pages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleCreatePage}
                    disabled={isSubmitting}
                >
                    <FilePlus className="h-4 w-4" />
                    {isSubmitting ? 'Creando...' : 'Agregar Página'}
                </Button>
            </div>

            {pages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                    No hay documentos asociados
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedPages.map(page => (
                        <div
                            key={page.id}
                            onClick={() => router.push(`/dashboard/incidences/${incidenceId}/pages/${page.id}`)}
                            className="flex flex-col p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-start gap-3">
                                {page.pageType === IncidencePageType.SYSTEM_SCRIPTS ? (
                                    <Code2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                ) : (
                                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate" title={page.title || 'Nueva Página'}>
                                        {page.title || 'Nueva Página'}
                                    </h4>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {page.isMainPage ? (
                                                <DropdownMenuItem disabled>
                                                    <Star className="h-4 w-4 mr-2 fill-yellow-500 text-yellow-500" />
                                                    Ya es la principal
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem
                                                    onClick={(e) => handleSetMainPage(page, e)}
                                                    disabled={isSettingMain}
                                                >
                                                    <Star className="h-4 w-4 mr-2" />
                                                    Fijar
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                onClick={(e) => handleCopyLink(page, e)}
                                            >
                                                <Link className="h-4 w-4 mr-2" />
                                                Copiar enlace
                                            </DropdownMenuItem>
                                            {page.pageType === IncidencePageType.DEFAULT && (
                                                <DropdownMenuItem
                                                    className="text-red-500 focus:text-red-500"
                                                    onClick={(e) => handleDeleteClick(page, e)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Eliminar Página
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(page.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>{page.author.name || page.author.username}</span>
                                    {page.isMainPage && (
                                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Eliminar Página</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de que deseas eliminar la página &quot;{pageToDelete?.title || 'Nueva Página'}&quot;? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
