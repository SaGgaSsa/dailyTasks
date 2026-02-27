'use client'

import { useEffect, useState } from 'react'
import { useIncidenceTitle } from '@/components/providers/incidence-title-provider'
import { usePageTitle } from '@/components/providers/page-title-provider'
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
    const { setIncidenceTitle } = useIncidenceTitle()
    const { setPageTitle } = usePageTitle()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setIncidenceTitle(incidenceTitle)
        setPageTitle(initialTitle)
        setMounted(true)

        return () => {
            setIncidenceTitle(null)
            setPageTitle(null)
        }
    }, [incidenceTitle, initialTitle, setIncidenceTitle, setPageTitle])

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
