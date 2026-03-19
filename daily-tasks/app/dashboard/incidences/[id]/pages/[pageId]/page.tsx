import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { PageEditorContent } from './_components/page-editor-content'
import { canEditIncidencePage, getAuthenticatedUser, getPageAccessContext } from '@/lib/authorization'

interface PageProps {
    params: Promise<{ id: string; pageId: string }>
}

export default async function PageEditorPage({ params }: PageProps) {
    const { id, pageId } = await params
    const user = await getAuthenticatedUser()
    
    if (!user) {
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

    const accessContext = await getPageAccessContext(page.id, user.id)
    const canEdit = accessContext ? canEditIncidencePage(user, accessContext) : false

    return (
        <PageEditorContent
            initialContent={page.content as object | undefined}
            initialTitle={page.title}
            pageId={page.id}
            incidenceId={incidenceNumberId}
            incidenceTitle={page.incidence.description}
            canEdit={canEdit}
        />
    )
}
