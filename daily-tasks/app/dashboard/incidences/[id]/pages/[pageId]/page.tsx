import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { EditorWrapper } from './editor-wrapper'

interface PageProps {
    params: Promise<{ id: string; pageId: string }>
}

export default async function PageEditorPage({ params }: PageProps) {
    const { id, pageId } = await params
    const session = await auth()
    
    if (!session?.user) {
        notFound()
    }

    const pageNumberId = parseInt(pageId, 10)
    const incidenceNumberId = parseInt(id, 10)

    if (isNaN(pageNumberId) || isNaN(incidenceNumberId)) {
        notFound()
    }

    const page = await db.incidencePage.findUnique({
        where: { id: pageNumberId },
        include: { incidence: true }
    })

    if (!page || page.incidenceId !== incidenceNumberId) {
        notFound()
    }

    return (
        <EditorWrapper
            initialContent={page.content as object | undefined}
            initialTitle={page.title}
            pageId={page.id}
            incidenceId={incidenceNumberId}
            isEditor={true}
        />
    )
}
