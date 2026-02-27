'use client'

import dynamic from 'next/dynamic'

const BlockNoteEditor = dynamic(
    () => import('./_components/block-note-editor').then(mod => mod.BlockNoteEditor),
    { 
        ssr: false,
        loading: () => <div className="p-8 text-center text-muted-foreground">Cargando editor...</div>
    }
)

interface EditorWrapperProps {
    initialContent: object | undefined
    pageId: number
    incidenceId: number
    isEditor?: boolean
}

export function EditorWrapper({ initialContent, pageId, incidenceId, isEditor }: EditorWrapperProps) {
    return (
        <BlockNoteEditor
            initialContent={initialContent}
            pageId={pageId}
            incidenceId={incidenceId}
            isEditor={isEditor}
        />
    )
}
