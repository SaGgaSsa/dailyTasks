'use client'

import { IncidencePageWithAuthor } from '@/types'
import dynamic from 'next/dynamic'

const ReadonlyBlockNote = dynamic(
    () => import('./readonly-block-note').then(mod => mod.ReadonlyBlockNote),
    { ssr: false }
)

interface GeneralTabProps {
    comment: string | null
    pages?: IncidencePageWithAuthor[]
}

export function GeneralTab({ comment, pages }: GeneralTabProps) {
    const mainPage = pages?.find(p => p.isMainPage)

    if (mainPage && mainPage.content) {
        return <ReadonlyBlockNote initialContent={mainPage.content as object} />
    }

    if (!comment) {
        return (
            <p className="text-muted-foreground/60 italic">
                No hay descripción proporcionada.
            </p>
        )
    }

    return (
        <p className="whitespace-pre-wrap text-muted-foreground">
            {comment}
        </p>
    )
}
