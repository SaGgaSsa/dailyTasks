'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus, FileText, Calendar, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IncidencePageWithAuthor } from '@/types'
import { createPage } from '@/app/actions/pages'

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

    const handleCreatePage = async () => {
        setIsSubmitting(true)
        try {
            const result = await createPage(incidenceId, 'Nueva Página')
            if (result.success && result.data) {
                router.push(`/dashboard/incidences/${incidenceId}/pages/${result.data.id}`)
                onRefresh?.()
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Documentos</h3>
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
                    {pages.map(page => (
                        <div
                            key={page.id}
                            onClick={() => router.push(`/dashboard/incidences/${incidenceId}/pages/${page.id}`)}
                            className="flex flex-col p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        >
                            <div className="flex items-start gap-3">
                                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium truncate" title={page.title}>
                                        {page.title}
                                    </h4>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(page.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <UserIcon className="h-3 w-3" />
                                    <span>{page.author.name || page.author.username}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
