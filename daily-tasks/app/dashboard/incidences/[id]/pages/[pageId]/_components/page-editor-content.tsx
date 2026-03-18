'use client'

import { useEffect } from 'react'
import { useNavbarBreadcrumbs } from '@/components/providers/navbar-breadcrumb-provider'
import { EditorWrapper } from '../editor-wrapper'
import { ReadonlyBlockNoteWrapper } from '@/app/dashboard/shared-pages/[pageId]/readonly-block-note-wrapper'

interface PageEditorContentProps {
    initialContent: object | undefined
    initialTitle: string
    pageId: number
    incidenceId: number
    incidenceTitle: string
    canEdit: boolean
}

export function PageEditorContent({ 
    initialContent, 
    initialTitle, 
    pageId, 
    incidenceId,
    incidenceTitle,
    canEdit,
}: PageEditorContentProps) {
    const { setBreadcrumbs } = useNavbarBreadcrumbs()

    useEffect(() => {
        setBreadcrumbs([
            { label: 'Incidencias', href: '/dashboard' },
            { label: incidenceTitle, href: `/dashboard/incidences/${incidenceId}` },
            { label: initialTitle },
        ])

        return () => {
            setBreadcrumbs([])
        }
    }, [incidenceTitle, initialTitle, incidenceId, setBreadcrumbs])

    return (
        <div className="pt-4 px-8 max-w-4xl mx-auto">
            {canEdit ? (
                <EditorWrapper
                    initialContent={initialContent}
                    initialTitle={initialTitle || ''}
                    pageId={pageId}
                    incidenceId={incidenceId}
                    isEditor={true}
                    isTitleEditable={true}
                />
            ) : (
                <div className="space-y-4">
                    <h1 className="text-2xl font-semibold pl-[54px]">{initialTitle || 'Nueva Página'}</h1>
                    <ReadonlyBlockNoteWrapper initialContent={initialContent} />
                </div>
            )}
        </div>
    )
}
