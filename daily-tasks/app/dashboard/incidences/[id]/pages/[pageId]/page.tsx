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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <main className="py-8">
                <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white dark:bg-zinc-900 shadow-lg border border-gray-200 dark:border-zinc-700 p-12 lg:p-16">
                    <EditorWrapper
                        initialContent={page.content as object | undefined}
                        pageId={page.id}
                        incidenceId={incidenceNumberId}
                        isEditor={true}
                    />
                </div>
            </main>
        </div>
    )
}
