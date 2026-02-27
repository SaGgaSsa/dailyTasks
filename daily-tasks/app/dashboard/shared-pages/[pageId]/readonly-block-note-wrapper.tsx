'use client'

import dynamic from 'next/dynamic'

const ReadonlyBlockNote = dynamic(
    () => import('../../incidences/[id]/_components/readonly-block-note').then(mod => mod.ReadonlyBlockNote),
    { ssr: false }
)

interface ReadonlyBlockNoteWrapperProps {
    initialContent: object | undefined
}

export function ReadonlyBlockNoteWrapper({ initialContent }: ReadonlyBlockNoteWrapperProps) {
    return <ReadonlyBlockNote initialContent={initialContent} />
}
