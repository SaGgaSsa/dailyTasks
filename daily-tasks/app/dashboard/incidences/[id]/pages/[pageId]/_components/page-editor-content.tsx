'use client'

import { useEffect, useState } from 'react'
import { useNavbarBreadcrumbs } from '@/components/providers/navbar-breadcrumb-provider'
import { EditorWrapper } from '../editor-wrapper'

interface PageEditorContentProps {
    initialContent: object | undefined
    initialTitle: string
    pageId: number
    incidenceId: number
    incidenceTitle: string
}

export function PageEditorContent({ 
    initialContent, 
    initialTitle, 
    pageId, 
    incidenceId,
    incidenceTitle 
}: PageEditorContentProps) {
    const { setBreadcrumbs } = useNavbarBreadcrumbs()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setBreadcrumbs([
            { label: 'Incidencias', href: '/dashboard' },
            { label: incidenceTitle, href: `/dashboard/incidences/${incidenceId}` },
            { label: initialTitle },
        ])
        setMounted(true)

        return () => {
            setBreadcrumbs([])
        }
    }, [incidenceTitle, initialTitle, incidenceId, setBreadcrumbs])

    if (!mounted) {
        return null
    }

    return (
        <div className="pt-4 px-8 max-w-4xl mx-auto">
            <EditorWrapper
                initialContent={initialContent}
                initialTitle={initialTitle || ''}
                pageId={pageId}
                incidenceId={incidenceId}
                isEditor={true}
            />
        </div>
    )
}
