import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { ReadonlyBlockNote } from '../../incidences/[id]/_components/readonly-block-note'

interface PageProps {
    params: Promise<{ pageId: string }>
}

export default async function SharedPageView({ params }: PageProps) {
    const { pageId } = await params
    const session = await auth()

    if (!session?.user) {
        notFound()
    }

    const pageNumberId = parseInt(pageId, 10)

    if (isNaN(pageNumberId)) {
        notFound()
    }

    const page = await db.incidencePage.findUnique({
        where: { id: pageNumberId },
        include: { 
            incidence: true,
            author: true
        }
    })

    if (!page) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-zinc-100 py-8 px-4">
            <div className="max-w-[210mm] mx-auto">
                <div className="mb-6 text-center">
                    <h1 className="text-2xl font-semibold text-foreground">Documento Compartido</h1>
                    <p className="text-muted-foreground mt-1">
                        Pertenece a la incidencia: <span className="font-medium">{page.incidence.title}</span>
                    </p>
                </div>

                <div className="bg-white shadow-lg min-h-[297mm] p-[20mm]">
                    <ReadonlyBlockNote initialContent={page.content as object | undefined} />
                </div>
            </div>
        </div>
    )
}
